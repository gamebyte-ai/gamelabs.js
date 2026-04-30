import type { IInjectionTarget, IInstanceResolver } from "@gamebyte/gamelabsjs";
import { BUBBLE_COLORS, type BubbleColor } from "../constants/BubbleColor";
import { GameEvents } from "../events/GameEvents";
import { BubbleGrid } from "../models/BubbleGrid";
import { Shooter } from "../models/Shooter";
import { BubbleShooterConfig } from "../BubbleShooterConfig";
import { BubbleGridLayout } from "./BubbleGridLayout";
import { AimTrajectoryCalculator, type IAimLanding, type IAimTrajectorySegment, type IAimTrajectory } from "./AimTrajectoryCalculator";
import { MatchFinder } from "./MatchFinder";
import { FloatingBubbleFinder } from "./FloatingBubbleFinder";

const EMPTY_TRAJECTORY: IAimTrajectory = { segments: [], end: "none", landing: null };

interface IFlyingBubbleState {
  readonly color: BubbleColor;
  readonly segments: readonly IAimTrajectorySegment[];
  readonly segLengths: readonly number[];
  readonly segDirX: readonly number[];
  readonly segDirY: readonly number[];
  readonly landing: IAimLanding;
  segmentIndex: number;
  traveledInSegment: number;
}

/**
 * Coordinates writes to the {@link BubbleGrid} and {@link Shooter} models
 * and announces them via {@link GameEvents}.
 *
 * Step 4 adds the firing state machine: {@link fire} kicks the held
 * bubble onto a precomputed trajectory; {@link update} advances it each
 * frame; on completion the bubble snaps into the cell shown by the
 * landing preview, the next bubble loads, and aim resumes from the
 * latest cursor position.
 */
export class GameOperations implements IInjectionTarget {
  private _config: BubbleShooterConfig | null = null;
  private _layout: BubbleGridLayout | null = null;
  private _grid: BubbleGrid | null = null;
  private _shooter: Shooter | null = null;
  private _events: GameEvents | null = null;
  private _aimCalculator: AimTrajectoryCalculator | null = null;
  private _matchFinder: MatchFinder | null = null;
  private _floatingFinder: FloatingBubbleFinder | null = null;

  private _state: "idle" | "flying" = "idle";
  private _flying: IFlyingBubbleState | null = null;
  private _lastAimX = 0;
  private _lastAimY = 0;

  public inject(resolver: IInstanceResolver): void {
    this._config = resolver.getInstance(BubbleShooterConfig);
    this._layout = resolver.getInstance(BubbleGridLayout);
    this._grid = resolver.getInstance(BubbleGrid);
    this._shooter = resolver.getInstance(Shooter);
    this._events = resolver.getInstance(GameEvents);
    this._aimCalculator = resolver.getInstance(AimTrajectoryCalculator);
    this._matchFinder = resolver.getInstance(MatchFinder);
    this._floatingFinder = resolver.getInstance(FloatingBubbleFinder);
  }

  /** Build initial layout, load first shooter bubble, point straight up. */
  public start(): void {
    this.buildInitialLayout();
    this.loadNextBubble();
    const layout = this._layout!;
    this.aimAt(layout.shooterX, layout.shooterY + 1);
  }

  public buildInitialLayout(): void {
    const grid = this._grid!;
    const events = this._events!;
    const filledRows = Math.max(0, grid.rowCount - this._config!.initialEmptyBottomRows);
    for (let row = 0; row < filledRows; row++) {
      const colCount = grid.getColumnCount(row);
      for (let col = 0; col < colCount; col++) {
        const color = this._pickColor(row, col);
        grid.setColor(row, col, color);
        events.emitBubblePlaced(row, col, color);
      }
    }
  }

  public loadNextBubble(): void {
    const palette = BUBBLE_COLORS;
    const color = palette[Math.floor(Math.random() * palette.length)]!;
    this._shooter!.setHeldColor(color);
    this._events!.emitShooterColorChanged(color);
  }

  /**
   * Point the shooter at a world position. Always remembers the latest
   * coordinates so we can resume aim after a flight ends. Trajectory
   * emission is suppressed while a bubble is in flight — the aim line
   * and landing preview stay hidden until the bubble snaps.
   *
   * When the cursor is below the shooter's centre, aiming is disabled:
   * the shooter freezes at its last valid angle and the aim line +
   * landing preview hide. {@link fire} likewise refuses while disabled.
   */
  public aimAt(worldX: number, worldY: number): void {
    this._lastAimX = worldX;
    this._lastAimY = worldY;

    const layout = this._layout!;
    const config = this._config!;

    if (worldY < layout.shooterY) {
      if (this._state !== "flying") this._events!.emitAimTrajectoryChanged(EMPTY_TRAJECTORY);
      return;
    }

    const dx = worldX - layout.shooterX;
    const dy = worldY - layout.shooterY;
    if (dx === 0 && dy === 0) return;

    const minAngle = config.aimMinAngleFromHorizontalRad;
    const maxAngle = Math.PI - minAngle;
    let angle = Math.atan2(dy, dx);
    if (!Number.isFinite(angle)) return;
    if (angle < minAngle) angle = minAngle;
    if (angle > maxAngle) angle = maxAngle;

    this._shooter!.setAimAngle(angle);
    this._events!.emitShooterAimChanged(angle);

    if (this._state === "flying") return;
    const trajectory = this._aimCalculator!.compute(angle);
    this._events!.emitAimTrajectoryChanged(trajectory);
  }

  /**
   * Fire the currently-held bubble. Quietly ignored unless we're idle,
   * have a held colour, and the current aim resolves to a reachable
   * landing cell. Loads the next bubble onto the shooter immediately so
   * the player sees it during flight; the new bubble can't fire until
   * the in-flight bubble snaps.
   */
  public fire(): void {
    if (this._state !== "idle") return;
    // Aim disabled while the cursor is below the shooter centre.
    if (this._lastAimY < this._layout!.shooterY) return;
    const shooter = this._shooter!;
    const heldColor = shooter.heldColor;
    if (heldColor === null) return;

    const trajectory = this._aimCalculator!.compute(shooter.aimAngle);
    if (trajectory.segments.length === 0 || trajectory.landing === null) return;

    const segLengths: number[] = [];
    const segDirX: number[] = [];
    const segDirY: number[] = [];
    for (const seg of trajectory.segments) {
      const dx = seg.toX - seg.fromX;
      const dy = seg.toY - seg.fromY;
      const len = Math.hypot(dx, dy);
      segLengths.push(len);
      segDirX.push(len === 0 ? 0 : dx / len);
      segDirY.push(len === 0 ? 0 : dy / len);
    }

    this._flying = {
      color: heldColor,
      segments: trajectory.segments,
      segLengths,
      segDirX,
      segDirY,
      landing: trajectory.landing,
      segmentIndex: 0,
      traveledInSegment: 0,
    };
    this._state = "flying";

    // Aim line off; landing preview off.
    this._events!.emitAimTrajectoryChanged(EMPTY_TRAJECTORY);
    // Push the flying bubble visual to its starting position.
    const start = trajectory.segments[0]!;
    this._events!.emitFlyingBubbleChanged(heldColor, start.fromX, start.fromY);
    // New bubble loads onto the shooter; firing stays blocked until snap.
    this.loadNextBubble();
  }

  public update(dt: number): void {
    if (this._state !== "flying" || !this._flying) return;
    const config = this._config!;
    let remaining = config.firedBubbleSpeed * dt;

    while (remaining > 0 && this._flying.segmentIndex < this._flying.segments.length) {
      const idx = this._flying.segmentIndex;
      const segLen = this._flying.segLengths[idx]!;
      const segLeft = segLen - this._flying.traveledInSegment;
      if (remaining < segLeft) {
        this._flying.traveledInSegment += remaining;
        remaining = 0;
      } else {
        remaining -= segLeft;
        this._flying.segmentIndex++;
        this._flying.traveledInSegment = 0;
      }
    }

    if (this._flying.segmentIndex >= this._flying.segments.length) {
      this._completeFlight();
      return;
    }

    const idx = this._flying.segmentIndex;
    const seg = this._flying.segments[idx]!;
    const x = seg.fromX + this._flying.segDirX[idx]! * this._flying.traveledInSegment;
    const y = seg.fromY + this._flying.segDirY[idx]! * this._flying.traveledInSegment;
    this._events!.emitFlyingBubbleChanged(this._flying.color, x, y);
  }

  private _completeFlight(): void {
    if (!this._flying) return;
    const { landing, color } = this._flying;
    const grid = this._grid!;
    const events = this._events!;

    grid.setColor(landing.row, landing.col, color);
    events.emitBubblePlaced(landing.row, landing.col, color);
    events.emitFlyingBubbleChanged(null, 0, 0);

    // Match-and-pop. Group includes the just-placed bubble; below the
    // threshold the bubble simply stays put.
    const group = this._matchFinder!.findConnectedGroup(landing.row, landing.col);
    if (group.length >= this._config!.matchPopThreshold) {
      for (const cell of group) {
        grid.setColor(cell.row, cell.col, null);
        events.emitBubbleRemoved(cell.row, cell.col);
      }
      // Anything no longer anchored to the top row drops.
      const floating = this._floatingFinder!.findFloating();
      for (const cell of floating) {
        grid.setColor(cell.row, cell.col, null);
        events.emitBubbleRemoved(cell.row, cell.col);
      }
    }

    this._flying = null;
    this._state = "idle";

    // Re-aim from the latest cursor position now that the grid changed.
    this.aimAt(this._lastAimX, this._lastAimY);
  }

  /**
   * Deterministic colour pick for a varied non-striped pattern. Mixing
   * row-and-column primes plus a per-row-band offset breaks the diagonal
   * runs you'd otherwise see from a pure `(row + col) % N` scheme.
   */
  private _pickColor(row: number, col: number): BubbleColor {
    const palette = BUBBLE_COLORS;
    const hash = row * 31 + col * 53 + Math.floor(row / 2) * 11 + (col & 1) * 17;
    const index = ((hash % palette.length) + palette.length) % palette.length;
    return palette[index]!;
  }
}
