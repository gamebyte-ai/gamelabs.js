import type { IInjectionTarget, IInstanceResolver } from "@gamebyte/gamelabsjs";
import { BUBBLE_COLORS, BubbleColor } from "../constants/BubbleColor";
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
  /** Colour of the in-flight bubble. `null` when {@link isBomb} is true. */
  readonly color: BubbleColor | null;
  /** Bomb power-up flight; `_completeFlight` runs the explosion path instead of a snap. */
  readonly isBomb: boolean;
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

interface IFireballState {
  x: number;
  y: number;
  readonly vx: number;
  readonly vy: number;
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

  private _state: "idle" | "flying" | "popping" | "flying-fireball" | "swapping" = "idle";
  private _swapTimer = 0;
  private _flying: IFlyingBubbleState | null = null;
  private _fireball: IFireballState | null = null;
  private _popQueue: IMatchedCell[] = [];
  private _popTimer = 0;
  /** Per-pop-session counter used to compute the (n+1)·popPointsStep score per bubble. */
  private _popIndexInSession = 0;
  /** Disconnected bubbles in mid-fall. Lives independently of the main state machine. */
  private _falling: IFallingBubbleState[] = [];
  private _nextFallingId = 0;
  /** Remaining bomb power-ups. Decremented on bomb fire, refilled at level start. */
  private _bombCount = 0;
  /** Remaining fireball power-ups. Decremented on fireball fire. */
  private _fireballCount = 0;
  /**
   * Input lock — true the moment the grid clears (well before the win
   * message is allowed to show). Disables every input so the player
   * can't fire / swap / pop a power-up during the falling-bubble
   * wind-down.
   */
  private _isWon = false;
  /**
   * Final win latch — true once the grid is empty AND every falling
   * bubble has finished. Gates the win message + the public game-won
   * event so it doesn't appear over still-falling debris.
   */
  private _winLatched = false;
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

  /** Build the default level, load shooter held + next, point straight up. */
  public start(): void {
    this.loadLevel("level-1");
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

    // Stone overrides go on AFTER the colour fill so they can sit
    // anywhere — including cells the procedural fill just placed.
    if (level.stoneCells) {
      const grid = this._grid!;
      const events = this._events!;
      for (const sc of level.stoneCells) {
        grid.setColor(sc.row, sc.col, BubbleColor.Stone);
        events.emitBubblePlaced(sc.row, sc.col, BubbleColor.Stone);
      }
    }

    this._score!.reset();
    this._events!.emitScoreChanged(0);
    this._bombCount = this._config!.initialBombCount;
    this._events!.emitBombCountChanged(this._bombCount);
    this._fireballCount = this._config!.initialFireballCount;
    this._events!.emitFireballCountChanged(this._fireballCount);
    if (this._isWon) {
      this._isWon = false;
      this._events!.emitShooterControlsLocked(false);
    }
    if (this._winLatched) {
      this._winLatched = false;
      this._events!.emitGameWonChanged(false);
    }
    this.aimAt(this._lastAimX, this._lastAimY);
  }

  /** Wipe transient flight / pop / falling / bomb / fireball state and notify the view. */
  private _cancelTransientState(): void {
    const events = this._events!;
    if (this._flying) {
      if (this._flying.isBomb) events.emitFlyingBombChanged(false, 0, 0);
      else events.emitFlyingBubbleChanged(null, 0, 0);
      this._flying = null;
    }
    if (this._fireball) {
      events.emitFireballChanged(false, 0, 0);
      this._fireball = null;
    }
    this._popQueue.length = 0;
    this._popTimer = 0;
    this._popIndexInSession = 0;
    for (const f of this._falling) events.emitFallingBubbleChanged(f.id, null, f.x, f.y);
    this._falling.length = 0;
    if (this._shooter?.isBomb) {
      this._shooter.setIsBomb(false);
      events.emitShooterBombChanged(false);
    }
    if (this._shooter?.isFireball) {
      this._shooter.setIsFireball(false);
      events.emitShooterFireballChanged(false);
    }
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
    if (this._isWon) return;
    if (this._state !== "idle") return;
    const shooter = this._shooter!;
    const a = shooter.heldColor;
    const b = shooter.nextColor;
    if (a === null || b === null) return;
    // Mutate the model directly (skip `_setHeldColor` / `_setNextColor`
    // so we don't emit the per-slot colour-changed events). The view
    // gets a single coordinated `onShooterSwap` event and applies
    // materials atomically when its position-swap animation finishes.
    shooter.setHeldColor(b);
    shooter.setNextColor(a);
    this._state = "swapping";
    this._swapTimer = this._config!.shooterSwapDurationSeconds;
    this._events!.emitShooterSwap(b, a);
  }

  private _initShooterBubbles(): void {
    // `_randomColor` returns null when only stones (or nothing) remain
    // on the grid; the held / next slots show empty in that case.
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

  /**
   * Pick a colour from those currently present on the grid (excluding
   * stones). Returns `null` when no colour bubbles remain — at that
   * point the held / next slots show empty and the game is winding
   * down toward the win condition.
   */
  private _randomColor(): BubbleColor | null {
    const present = this._collectPresentColors();
    if (present.length === 0) return null;
    return present[Math.floor(Math.random() * present.length)]!;
  }

  private _collectPresentColors(): BubbleColor[] {
    const grid = this._grid!;
    const set = new Set<BubbleColor>();
    for (let row = 0; row < grid.rowCount; row++) {
      const cols = grid.getColumnCount(row);
      for (let col = 0; col < cols; col++) {
        const c = grid.getColor(row, col);
        if (c !== null && c !== BubbleColor.Stone) set.add(c);
      }
    }
    return [...set];
  }

  private _isGridEmpty(): boolean {
    const grid = this._grid!;
    for (let row = 0; row < grid.rowCount; row++) {
      const cols = grid.getColumnCount(row);
      for (let col = 0; col < cols; col++) {
        if (grid.isOccupied(row, col)) return false;
      }
    }
    return true;
  }

  /**
   * Two-stage win check. Stage 1 fires the moment the grid empties:
   * locks shooter controls (so the player can't activate power-ups
   * during the fall-out wait) but leaves any falling bubbles to play
   * out. Stage 2 latches the win — and emits the public game-won
   * event — only once the grid is empty *and* every falling bubble
   * has finished, so the win message never appears over still-moving
   * debris. Re-entered from {@link _updateFalling} when the last fall
   * resolves.
   */
  private _checkWin(): void {
    if (this._winLatched) return;
    if (!this._isGridEmpty()) return;
    if (!this._isWon) {
      this._isWon = true;
      this._events!.emitShooterControlsLocked(true);
    }
    if (this._falling.length > 0) return;
    this._winLatched = true;
    this._events!.emitGameWonChanged(true);
  }

  /**
   * Re-roll the held / next slots if their colour is no longer present
   * on the grid. Run after every pop sequence so the player can never
   * end up holding a colour that's been fully cleared.
   */
  private _validateShooterColors(): void {
    const present = new Set(this._collectPresentColors());
    const held = this._shooter!.heldColor;
    const next = this._shooter!.nextColor;
    if (held !== null && !present.has(held)) this._setHeldColor(this._randomColor());
    if (next !== null && !present.has(next)) this._setNextColor(this._randomColor());
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
    if (this._isWon) return;
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
    if (this._isWon) return;
    if (this._state !== "idle") return;
    // Aim disabled while the cursor is below the shooter centre.
    if (this._lastAimY < this._layout!.shooterY) return;
    const shooter = this._shooter!;
    const isBomb = shooter.isBomb;
    const isFireball = shooter.isFireball;
    const heldColor = shooter.heldColor;
    // Fireball flight bypasses the trajectory / snap pipeline entirely.
    if (isFireball) {
      this._fireFireball();
      return;
    }
    // Either a coloured held bubble or a bomb power-up must be loaded.
    if (!isBomb && heldColor === null) return;

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
      color: isBomb ? null : heldColor,
      isBomb,
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
    // Push the flying visual to its starting position.
    const start = trajectory.segments[0]!;
    if (isBomb) {
      this._events!.emitFlyingBombChanged(true, start.fromX, start.fromY);
      // Bomb consumed — decrement the inventory and clear bomb mode so
      // the new bubble can flow into the held slot.
      shooter.setIsBomb(false);
      this._events!.emitShooterBombChanged(false);
      this._bombCount = Math.max(0, this._bombCount - 1);
      this._events!.emitBombCountChanged(this._bombCount);
    } else {
      this._events!.emitFlyingBubbleChanged(heldColor, start.fromX, start.fromY);
    }
    // Promote next → held and generate a fresh next; firing stays
    // blocked until snap.
    this._promoteNextBubble();
  }

  /**
   * Load a bomb power-up into the shooter's held slot, replacing the
   * current held colour. Quietly ignored unless we're idle and bomb
   * mode isn't already on. The held colour is discarded — fire to use
   * the bomb, then the next bubble flows in normally.
   */
  public activateBomb(): void {
    if (this._isWon) return;
    if (this._state !== "idle") return;
    if (this._bombCount <= 0) return;
    const shooter = this._shooter!;
    if (shooter.isBomb) return;
    // Power-ups are mutually exclusive — activating a different one
    // clears any current power-up first.
    if (shooter.isFireball) {
      shooter.setIsFireball(false);
      this._events!.emitShooterFireballChanged(false);
    }
    this._setHeldColor(null);
    shooter.setIsBomb(true);
    this._events!.emitShooterBombChanged(true);
  }

  /**
   * Load a fireball power-up into the shooter's held slot. Same idle /
   * inventory rules as {@link activateBomb}; clears any active bomb
   * first since the two power-ups share the held slot.
   */
  public activateFireball(): void {
    if (this._isWon) return;
    if (this._state !== "idle") return;
    if (this._fireballCount <= 0) return;
    const shooter = this._shooter!;
    if (shooter.isFireball) return;
    if (shooter.isBomb) {
      shooter.setIsBomb(false);
      this._events!.emitShooterBombChanged(false);
    }
    this._setHeldColor(null);
    shooter.setIsFireball(true);
    this._events!.emitShooterFireballChanged(true);
  }

  public update(dt: number): void {
    // Falling bubbles tick every frame regardless of state — they're
    // already detached from the grid, so flight + popping carry on
    // independently.
    if (this._falling.length > 0) this._updateFalling(dt);

    if (this._state === "swapping") {
      this._swapTimer -= dt;
      if (this._swapTimer <= 0) {
        this._swapTimer = 0;
        this._state = "idle";
      }
      return;
    }
    if (this._state === "popping") {
      this._updatePopping(dt);
      return;
    }
    if (this._state === "flying-fireball") {
      this._updateFireball(dt);
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
    if (this._flying.isBomb) {
      this._events!.emitFlyingBombChanged(true, x, y);
    } else {
      this._events!.emitFlyingBubbleChanged(this._flying.color, x, y);
    }
  }

  private _completeFlight(): void {
    if (!this._flying) return;
    const { landing, color, isBomb } = this._flying;
    const events = this._events!;

    // Bomb path: skip the snap-into-grid step, hide the flying bomb,
    // and run the synchronous explosion.
    if (isBomb) {
      events.emitFlyingBombChanged(false, 0, 0);
      this._flying = null;
      this._explodeBomb(landing);
      return;
    }

    // Below the bomb branch the bubble is always coloured.
    if (color === null) return;
    const grid = this._grid!;
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

  /**
   * Detonate a bomb at the given landing cell. Pops every occupied cell
   * within `bombBlastRingCount` hex rings around the centre at once —
   * no popping queue, all bursts fire on the same frame. Standard
   * post-pop logic (floating-bubble drop, score, re-aim) runs after.
   */
  private _explodeBomb(landing: IAimLanding): void {
    const grid = this._grid!;
    const layout = this._layout!;
    const events = this._events!;
    const config = this._config!;

    const targets = this._collectBombBlastCells(landing.row, landing.col, config.bombBlastRingCount);

    // Same per-cell scoring rule as cluster pops (5/10/15/...). Reset
    // the session counter so each bomb starts at index 1.
    this._popIndexInSession = 0;
    for (const cell of targets) {
      const color = grid.getColor(cell.row, cell.col);
      if (color === null) continue;
      this._popIndexInSession++;
      const points = this._popIndexInSession * config.popPointsStep;
      this._score!.add(points);
      events.emitScoreChanged(this._score!.value);
      const pos = layout.getCellWorldPosition(cell.row, cell.col);
      events.emitBubblePopped(pos.x, pos.y, color, points);
      grid.setColor(cell.row, cell.col, null);
      events.emitBubbleRemoved(cell.row, cell.col);
    }

    // Reuse the floating-drop machinery so disconnected chunks fall
    // exactly like they do after a normal cluster pop.
    this._spawnFallingForFloating();
    this._state = "idle";
    this._validateShooterColors();
    this._checkWin();
    if (this._isWon) return;
    this.aimAt(this._lastAimX, this._lastAimY);
  }

  /**
   * Fire a fireball: a straight-line projectile that pops every
   * cluster bubble its centre passes within
   * `fireballCollisionRadius` of, and continues until it exits the
   * play area. Walls are ignored — the fireball plows straight through.
   */
  private _fireFireball(): void {
    const layout = this._layout!;
    const config = this._config!;
    const shooter = this._shooter!;
    const events = this._events!;

    const angle = shooter.aimAngle;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const speed = config.fireballSpeed;
    const startX = layout.shooterX + dirX * config.shooterRadius;
    const startY = layout.shooterY + dirY * config.shooterRadius;

    this._fireball = { x: startX, y: startY, vx: dirX * speed, vy: dirY * speed };
    this._state = "flying-fireball";
    // Reset per-pop session so this fireball's pops start at index 1
    // (= 5 points), matching cluster + bomb scoring conventions.
    this._popIndexInSession = 0;

    events.emitAimTrajectoryChanged(EMPTY_TRAJECTORY);
    events.emitFireballChanged(true, startX, startY);

    // Clear held-slot fireball mode + decrement inventory + flow next
    // bubble in, mirroring the bomb fire path.
    shooter.setIsFireball(false);
    events.emitShooterFireballChanged(false);
    this._fireballCount = Math.max(0, this._fireballCount - 1);
    events.emitFireballCountChanged(this._fireballCount);
    this._promoteNextBubble();
  }

  private _updateFireball(dt: number): void {
    const f = this._fireball;
    if (!f) return;
    const config = this._config!;
    const layout = this._layout!;
    const grid = this._grid!;
    const events = this._events!;

    f.x += f.vx * dt;
    f.y += f.vy * dt;
    events.emitFireballChanged(true, f.x, f.y);

    // Pop every occupied cell whose centre is within collision radius
    // of the fireball's current position. `_popOneCell` increments the
    // session counter and emits the standard burst + score events.
    const r = config.fireballCollisionRadius;
    const r2 = r * r;
    for (let row = 0; row < grid.rowCount; row++) {
      const cols = grid.getColumnCount(row);
      for (let col = 0; col < cols; col++) {
        if (!grid.isOccupied(row, col)) continue;
        const cell = layout.getCellWorldPosition(row, col);
        const dx = cell.x - f.x;
        const dy = cell.y - f.y;
        if (dx * dx + dy * dy <= r2) this._popOneCell({ row, col });
      }
    }

    // Exit check: a margin past the play-area extents so the fireball
    // visibly clears the frame before vanishing.
    const halfW = layout.halfAreaWidth + config.bubbleRadius;
    const halfH = layout.halfAreaHeight + config.bubbleRadius;
    if (f.x < -halfW || f.x > halfW || f.y > halfH || f.y < -halfH) {
      this._endFireball();
    }
  }

  private _endFireball(): void {
    this._events!.emitFireballChanged(false, 0, 0);
    this._fireball = null;
    // Standard post-pop logic — disconnected chunks fall + pop on the
    // threshold, score keeps accumulating per the falling-pop rule.
    this._spawnFallingForFloating();
    this._state = "idle";
    this._validateShooterColors();
    this._checkWin();
    if (this._isWon) return;
    this.aimAt(this._lastAimX, this._lastAimY);
  }

  /**
   * BFS the hex grid out to `ringCount` from `(centerRow, centerCol)`,
   * collecting every in-bounds cell. ringCount=1 → 7 cells (centre + 6
   * neighbours); ringCount=2 → 19 cells; etc. Out-of-bounds neighbours
   * are skipped but never re-expanded, so an explosion near the edge of
   * the board doesn't wrap around.
   */
  private _collectBombBlastCells(centerRow: number, centerCol: number, ringCount: number): IMatchedCell[] {
    const layout = this._layout!;
    const visited = new Set<string>();
    const result: IMatchedCell[] = [];
    const key = (r: number, c: number): string => `${r}|${c}`;

    let frontier: IMatchedCell[] = [];
    if (layout.isInBounds(centerRow, centerCol)) {
      visited.add(key(centerRow, centerCol));
      result.push({ row: centerRow, col: centerCol });
      frontier.push({ row: centerRow, col: centerCol });
    }

    for (let depth = 1; depth <= ringCount; depth++) {
      const next: IMatchedCell[] = [];
      for (const cur of frontier) {
        for (const off of layout.getNeighborOffsets(cur.row)) {
          const nr = cur.row + off.dRow;
          const nc = cur.col + off.dCol;
          const k = key(nr, nc);
          if (visited.has(k)) continue;
          visited.add(k);
          if (!layout.isInBounds(nr, nc)) continue;
          result.push({ row: nr, col: nc });
          next.push({ row: nr, col: nc });
        }
      }
      frontier = next;
    }
    return result;
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
    const points = this._popIndexInSession * this._config!.popPointsStep;
    this._score!.add(points);
    events.emitScoreChanged(this._score!.value);

    const pos = layout.getCellWorldPosition(cell.row, cell.col);
    events.emitBubblePopped(pos.x, pos.y, color, points);
    grid.setColor(cell.row, cell.col, null);
    events.emitBubbleRemoved(cell.row, cell.col);
  }

  private _finishPopping(): void {
    this._spawnFallingForFloating();
    this._state = "idle";
    this._validateShooterColors();
    this._checkWin();
    if (this._isWon) return;
    this.aimAt(this._lastAimX, this._lastAimY);
  }

  /**
   * Detect floating cells, remove them from the grid, and spawn falling
   * visuals with an outward radial impulse from the group's centre of
   * mass. Shared by cluster-pop completion and bomb-explosion
   * completion.
   */
  private _spawnFallingForFloating(): void {
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
  }

  private _updateFalling(dt: number): void {
    const config = this._config!;
    const layout = this._layout!;
    const events = this._events!;
    const popY = layout.shooterY - config.fallingBubblePopDepth;
    const gravity = config.fallingBubbleGravity;
    const leftWall = layout.leftWallX;
    const rightWall = layout.rightWallX;

    const remaining: IFallingBubbleState[] = [];
    for (const f of this._falling) {
      f.vy -= gravity * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;

      // Bounce off the play-area side walls. Clamp first so a fast
      // bubble can't tunnel past in a single frame, then flip vx only
      // when actually moving into the wall (avoids re-triggering on
      // the next frame after a bounce).
      if (f.x < leftWall && f.vx < 0) {
        f.x = leftWall;
        f.vx = -f.vx;
      } else if (f.x > rightWall && f.vx > 0) {
        f.x = rightWall;
        f.vx = -f.vx;
      }

      if (f.y <= popY) {
        // Every falling bubble (including stones) awards the same
        // points and emits the standard burst.
        const points = config.fallingBubblePopPoints;
        this._score!.add(points);
        events.emitScoreChanged(this._score!.value);
        events.emitBubblePopped(f.x, f.y, f.color, points);
        events.emitFallingBubbleChanged(f.id, null, f.x, f.y);
        continue;
      }
      events.emitFallingBubbleChanged(f.id, f.color, f.x, f.y);
      remaining.push(f);
    }
    this._falling = remaining;
    // Stage-2 win re-entry: if the last fall just finished and the
    // grid is empty, this latches the win and shows the message.
    if (this._falling.length === 0 && this._isWon) this._checkWin();
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
