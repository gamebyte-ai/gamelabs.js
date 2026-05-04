import type { IInjectionTarget, IInstanceResolver } from "@gamebyte/gamelabsjs";
import { BUBBLE_COLORS, type BubbleColor } from "../constants/BubbleColor";
import { GameEvents } from "../events/GameEvents";
import { BubbleGrid } from "../models/BubbleGrid";
import { Shooter } from "../models/Shooter";
import { BubbleShooterConfig } from "../BubbleShooterConfig";
import { BubbleGridLayout } from "./BubbleGridLayout";
import { AimTrajectoryCalculator, type IAimLanding, type IAimTrajectorySegment, type IAimTrajectory } from "./AimTrajectoryCalculator";
import { MatchFinder, type IMatchedCell } from "./MatchFinder";
import { FloatingBubbleFinder } from "./FloatingBubbleFinder";
import { Score } from "../models/Score";
import { LEVELS } from "../constants/Levels";

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

interface IFallingBubbleState {
  readonly id: number;
  readonly color: BubbleColor;
  x: number;
  y: number;
  vx: number;
  vy: number;
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
  private _score: Score | null = null;

  private _state: "idle" | "flying" | "popping" = "idle";
  private _flying: IFlyingBubbleState | null = null;
  private _popQueue: IMatchedCell[] = [];
  private _popTimer = 0;
  /** Per-pop-session counter used to compute the (n+1)·popPointsStep score per bubble. */
  private _popIndexInSession = 0;
  /** Disconnected bubbles in mid-fall. Lives independently of the main state machine. */
  private _falling: IFallingBubbleState[] = [];
  private _nextFallingId = 0;
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
    this._score = resolver.getInstance(Score);
  }

  /** Build initial layout, load shooter held + next, point straight up. */
  public start(): void {
    this.buildInitialLayout();
    this._score!.reset();
    this._events!.emitScoreChanged(this._score!.value);
    this._initShooterBubbles();
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

  /**
   * Reset the grid to the layout of the given level. Cancels any
   * in-flight / popping / falling state and resets the score so the
   * test scenario starts from a clean slate.
   */
  public loadLevel(levelId: string): void {
    const level = LEVELS.find((l) => l.id === levelId);
    if (!level) return;

    this._cancelTransientState();
    this._clearGrid();

    if (level.placements === null) {
      this.buildInitialLayout();
    } else {
      const grid = this._grid!;
      const events = this._events!;
      for (const p of level.placements) {
        grid.setColor(p.row, p.col, p.color);
        events.emitBubblePlaced(p.row, p.col, p.color);
      }
    }

    this._score!.reset();
    this._events!.emitScoreChanged(0);
    this.aimAt(this._lastAimX, this._lastAimY);
  }

  /** Wipe transient flight / pop / falling state and notify the view. */
  private _cancelTransientState(): void {
    const events = this._events!;
    if (this._flying) {
      events.emitFlyingBubbleChanged(null, 0, 0);
      this._flying = null;
    }
    this._popQueue.length = 0;
    this._popTimer = 0;
    this._popIndexInSession = 0;
    for (const f of this._falling) events.emitFallingBubbleChanged(f.id, null, f.x, f.y);
    this._falling.length = 0;
    this._state = "idle";
  }

  private _clearGrid(): void {
    const grid = this._grid!;
    const events = this._events!;
    for (let row = 0; row < grid.rowCount; row++) {
      const colCount = grid.getColumnCount(row);
      for (let col = 0; col < colCount; col++) {
        if (grid.isOccupied(row, col)) {
          grid.setColor(row, col, null);
          events.emitBubbleRemoved(row, col);
        }
      }
    }
  }

  /**
   * Swap held ↔ next. Blocked while a bubble is in flight (which also
   * covers the synchronous pop / drop phase since state only flips back
   * to idle after _completeFlight finishes).
   */
  public swap(): void {
    if (this._state !== "idle") return;
    const shooter = this._shooter!;
    const a = shooter.heldColor;
    const b = shooter.nextColor;
    if (a === null || b === null) return;
    this._setHeldColor(b);
    this._setNextColor(a);
  }

  private _initShooterBubbles(): void {
    this._setHeldColor(this._randomColor());
    this._setNextColor(this._randomColor());
  }

  /**
   * Promote next → held and generate a fresh next. Called immediately on
   * fire, so during flight the shooter already shows the upcoming colour
   * (firing stays blocked until the in-flight bubble snaps).
   */
  private _promoteNextBubble(): void {
    const next = this._shooter!.nextColor ?? this._randomColor();
    this._setHeldColor(next);
    this._setNextColor(this._randomColor());
  }

  private _setHeldColor(color: BubbleColor | null): void {
    this._shooter!.setHeldColor(color);
    this._events!.emitShooterColorChanged(color);
  }

  private _setNextColor(color: BubbleColor | null): void {
    this._shooter!.setNextColor(color);
    this._events!.emitShooterNextColorChanged(color);
  }

  private _randomColor(): BubbleColor {
    const palette = BUBBLE_COLORS;
    return palette[Math.floor(Math.random() * palette.length)]!;
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
      if (this._state === "idle") this._events!.emitAimTrajectoryChanged(EMPTY_TRAJECTORY);
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

    if (this._state !== "idle") return;
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
    // Promote next → held and generate a fresh next; firing stays
    // blocked until snap.
    this._promoteNextBubble();
  }

  public update(dt: number): void {
    // Falling bubbles tick every frame regardless of state — they're
    // already detached from the grid, so flight + popping carry on
    // independently.
    if (this._falling.length > 0) this._updateFalling(dt);

    if (this._state === "popping") {
      this._updatePopping(dt);
      return;
    }
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

    const group = this._matchFinder!.findConnectedGroup(landing.row, landing.col);
    this._flying = null;

    if (group.length >= this._config!.matchPopThreshold) {
      // Sequential pop with score and particle burst per bubble. The
      // pop driver advances in `update(dt)`; floating-bubble drop runs
      // once the queue empties.
      this._popQueue = group.slice();
      this._popTimer = 0;
      this._popIndexInSession = 0;
      this._state = "popping";
      return;
    }

    this._state = "idle";
    this.aimAt(this._lastAimX, this._lastAimY);
  }

  private _updatePopping(dt: number): void {
    this._popTimer -= dt;
    while (this._popTimer <= 0 && this._popQueue.length > 0) {
      const cell = this._popQueue.shift()!;
      this._popOneCell(cell);
      this._popTimer += this._config!.popDelaySeconds;
    }
    if (this._popQueue.length === 0) this._finishPopping();
  }

  private _popOneCell(cell: IMatchedCell): void {
    const grid = this._grid!;
    const events = this._events!;
    const layout = this._layout!;
    const color = grid.getColor(cell.row, cell.col);
    if (color === null) return;

    this._popIndexInSession++;
    this._score!.add(this._popIndexInSession * this._config!.popPointsStep);
    events.emitScoreChanged(this._score!.value);

    const pos = layout.getCellWorldPosition(cell.row, cell.col);
    events.emitBubblePopped(pos.x, pos.y, color);
    grid.setColor(cell.row, cell.col, null);
    events.emitBubbleRemoved(cell.row, cell.col);
  }

  private _finishPopping(): void {
    // Anything no longer anchored to the top row detaches and starts
    // falling. Each falling bubble gets a fresh id so the view tracks
    // its mesh independently from any cluster mesh that may later
    // occupy the same cell.
    const grid = this._grid!;
    const layout = this._layout!;
    const events = this._events!;
    const config = this._config!;
    const floating = this._floatingFinder!.findFloating();

    // Snapshot positions + colours BEFORE removing anything so we can
    // compute the group's centre of mass (drives the outward impulse).
    interface IPending {
      row: number;
      col: number;
      color: BubbleColor;
      x: number;
      y: number;
    }
    const pending: IPending[] = [];
    let cx = 0;
    let cy = 0;
    for (const cell of floating) {
      const color = grid.getColor(cell.row, cell.col);
      if (color === null) continue;
      const pos = layout.getCellWorldPosition(cell.row, cell.col);
      pending.push({ row: cell.row, col: cell.col, color, x: pos.x, y: pos.y });
      cx += pos.x;
      cy += pos.y;
    }
    if (pending.length > 0) {
      cx /= pending.length;
      cy /= pending.length;
    }

    const impulse = config.fallingBubbleSeparationImpulse;
    const upBias = config.fallingBubbleSeparationUpBias;
    for (const p of pending) {
      grid.setColor(p.row, p.col, null);
      events.emitBubbleRemoved(p.row, p.col);

      // Outward direction from the group's centre — gives each bubble a
      // brief "scattering" beat before gravity overtakes the impulse.
      // A bubble exactly at the centre gets a random direction so a
      // single-cell drop still nudges visibly.
      let dx = p.x - cx;
      let dy = p.y - cy;
      const len = Math.hypot(dx, dy);
      if (len < 0.001) {
        const a = Math.random() * Math.PI * 2;
        dx = Math.cos(a);
        dy = Math.sin(a);
      } else {
        dx /= len;
        dy /= len;
      }
      const vx = dx * impulse;
      const vy = dy * impulse + upBias;

      const id = this._nextFallingId++;
      this._falling.push({ id, color: p.color, x: p.x, y: p.y, vx, vy });
      events.emitFallingBubbleChanged(id, p.color, p.x, p.y);
    }
    this._state = "idle";
    this.aimAt(this._lastAimX, this._lastAimY);
  }

  private _updateFalling(dt: number): void {
    const config = this._config!;
    const layout = this._layout!;
    const events = this._events!;
    const popY = layout.shooterY - config.fallingBubblePopDepth;
    const gravity = config.fallingBubbleGravity;

    const remaining: IFallingBubbleState[] = [];
    for (const f of this._falling) {
      f.vy -= gravity * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (f.y <= popY) {
        this._score!.add(config.fallingBubblePopPoints);
        events.emitScoreChanged(this._score!.value);
        events.emitBubblePopped(f.x, f.y, f.color);
        events.emitFallingBubbleChanged(f.id, null, f.x, f.y);
        continue;
      }
      events.emitFallingBubbleChanged(f.id, f.color, f.x, f.y);
      remaining.push(f);
    }
    this._falling = remaining;
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
