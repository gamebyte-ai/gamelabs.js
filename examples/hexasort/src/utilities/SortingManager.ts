import { UnsubscribeBag, UpdateManager, type IInjectionTarget, type IInstanceResolver } from "@gamebyte/gamelabsjs";
import { HexGrid } from "../models/HexGrid.js";
import type { IHexGridView } from "../views/IHexGridView.js";
import { HexaSortConfig } from "../HexaSortConfig.js";
import { SortOperations, type SortMove } from "./SortOperations.js";
import { SfxService } from "../services/SfxService.js";
import type { HexCoord } from "./HexNeighbors.js";

type Phase = "idle" | "sorting" | "destroying" | "cooldown";

/**
 * Global, single-track placement-merge state manager with continuous
 * grid-wide propagation, GSAP-driven animations, and deferred destruction.
 *
 * A *trigger queue* drives everything. A trigger is a cell to evaluate as
 * the placed cell of the next merge iteration. Triggers enter the queue
 * via three paths:
 *
 * 1. External: {@link enqueuePlacement} — player placed a stack.
 * 2. Post-sort rescan: after every merge iteration, every cell on the
 *    grid is scanned (in `(col, row)` order) and cells that currently
 *    have a matching neighbor are enqueued.
 * 3. Post-destruction rescan: after a cell's destruction completes, the
 *    same scan runs so the revealed top can seed new merges.
 *
 * Bound as a DI singleton. The view is attached later via
 * {@link setView} once the HexGridView has been created by the factory
 * — this lets the controller hold only the readonly `IHexGrid` while
 * the manager keeps the concrete mutable reference it needs to pop/push.
 */
export class SortingManager implements IInjectionTarget {
  private _grid: HexGrid | null = null;
  private _view: IHexGridView | null = null;
  private _config: HexaSortConfig | null = null;
  private _sfx: SfxService | null = null;

  private readonly _queue: HexCoord[] = [];
  private readonly _queuedKeys = new Set<number>();

  private _phase: Phase = "idle";

  // Current merge iteration state.
  private _mergeTarget: HexCoord | null = null;
  private _mergeColor: number | null = null;
  private _mergeSources: HexCoord[] = [];

  // Current destruction state.
  private _destroyCell: HexCoord | null = null;
  private _destroyColor: number | null = null;

  private _timeAccum = 0;
  private _animating = false;

  private readonly _subs = new UnsubscribeBag();

  public inject(resolver: IInstanceResolver): void {
    this._grid = resolver.getInstance(HexGrid);
    this._config = resolver.getInstance(HexaSortConfig);
    this._sfx = resolver.getInstance(SfxService);
    const updateManager = resolver.getInstance(UpdateManager);
    this._subs.add(updateManager.register((dt) => this._tick(dt)));
  }

  /**
   * Called by the HexGridViewController once its view has been built.
   * Pass `null` on controller destroy to release the reference; the
   * manager will simply skip animations until a new view is attached.
   */
  public setView(view: IHexGridView | null): void {
    this._view = view;
  }

  /** Queues a placement cell as a merge trigger. A running phase is never disturbed. */
  public enqueuePlacement(col: number, row: number): void {
    this._enqueueTrigger({ col, row });
    this._tryStartNext();
  }

  public destroy(): void {
    this._subs.flush();
    this._queue.length = 0;
    this._queuedKeys.clear();
    this._setIdle();
    this._animating = false;
    this._view = null;
    this._grid = null;
    this._config = null;
    this._sfx = null;
  }

  // --- Tick driver --------------------------------------------------------

  private _tick(dtSeconds: number): void {
    if (this._animating) return;
    if (!this._grid || !this._config) return;
    this._timeAccum += dtSeconds;
    while (!this._animating && this._timeAccum >= this._currentStepSeconds()) {
      this._timeAccum -= this._currentStepSeconds();
      this._fireStep();
    }
  }

  private _currentStepSeconds(): number {
    if (!this._config) return Number.POSITIVE_INFINITY;
    switch (this._phase) {
      case "sorting":
        return this._config.sortStepSeconds;
      case "destroying":
        return this._config.destructionStepSeconds;
      case "cooldown":
        return this._config.colorCooldownSeconds;
      default:
        return Number.POSITIVE_INFINITY;
    }
  }

  private _fireStep(): void {
    switch (this._phase) {
      case "sorting":
        this._onSortStep();
        return;
      case "destroying":
        this._onDestroyStep();
        return;
      case "cooldown":
        this._onCooldownElapsed();
        return;
      default:
        return;
    }
  }

  // --- Queue --------------------------------------------------------------

  private _enqueueTrigger(cell: HexCoord): void {
    const key = SortingManager._cellKey(cell.col, cell.row);
    if (this._queuedKeys.has(key)) return;
    this._queuedKeys.add(key);
    this._queue.push({ col: cell.col, row: cell.row });
  }

  private _dequeueTrigger(): HexCoord | null {
    const cell = this._queue.shift();
    if (!cell) return null;
    this._queuedKeys.delete(SortingManager._cellKey(cell.col, cell.row));
    return cell;
  }

  /** Scans the entire grid in `(col, row)` order and enqueues every cell with ≥1 matching neighbor. */
  private _rescanAndEnqueue(): void {
    if (!this._grid) return;
    for (let col = 0; col < this._grid.columnCount; col++) {
      for (let row = 0; row < this._grid.rowCount; row++) {
        if (SortOperations.findMatchingNeighbors(this._grid, col, row).length > 0) {
          this._enqueueTrigger({ col, row });
        }
      }
    }
  }

  // --- Phase transitions --------------------------------------------------

  /**
   * Peels off queued triggers until one yields a real merge iteration.
   * Empties the queue of no-op triggers; if none match, falls through to
   * destruction scan or idle.
   */
  private _tryStartNext(): void {
    if (this._phase !== "idle" || this._animating) return;
    while (this._queue.length > 0) {
      const trigger = this._dequeueTrigger()!;
      if (this._startMergeIteration(trigger)) {
        this._phase = "sorting";
        this._timeAccum = 0;
        return;
      }
    }
    this._enterDestructionOrIdle();
  }

  private _startMergeIteration(placed: HexCoord): boolean {
    if (!this._grid) return false;
    const top = this._grid.getTopColor(placed.col, placed.row);
    if (top === null) return false;
    const matches = SortOperations.findMatchingNeighbors(this._grid, placed.col, placed.row);
    if (matches.length === 0) return false;

    const target = matches.length === 1
      ? SortOperations.selectMergeTarget(this._grid, placed, matches[0]!)
      : placed;

    const sources: HexCoord[] = [];
    if (!SortingManager._sameCell(placed, target)) sources.push(placed);
    for (const m of matches) {
      if (!SortingManager._sameCell(m, target)) sources.push(m);
    }

    this._mergeTarget = target;
    this._mergeColor = top;
    this._mergeSources = sources;
    return true;
  }

  /** Queue empty + no merge possible anywhere → check destruction, else go idle. */
  private _enterDestructionOrIdle(): void {
    if (!this._grid || !this._config) {
      this._setIdle();
      return;
    }
    const candidates = SortOperations.findDestructionCandidates(this._grid, this._config.destructionThreshold);
    const cell = candidates[0] ?? null;
    if (cell) {
      const color = this._grid.getTopColor(cell.col, cell.row);
      if (color !== null) {
        this._destroyCell = cell;
        this._destroyColor = color;
        this._phase = "destroying";
        this._timeAccum = 0;
        return;
      }
    }
    this._setIdle();
  }

  private _setIdle(): void {
    this._phase = "idle";
    this._mergeTarget = null;
    this._mergeColor = null;
    this._mergeSources = [];
    this._destroyCell = null;
    this._destroyColor = null;
    this._timeAccum = 0;
  }

  private _enterCooldown(): void {
    this._phase = "cooldown";
    this._timeAccum = 0;
  }

  // --- Sort steps --------------------------------------------------------

  private _onSortStep(): void {
    const move = this._pickNextMergeMove();
    if (move) {
      this._startSortMove(move);
      return;
    }
    this._onMergeIterationDone();
  }

  /** First pending source whose top still matches `_mergeColor`. */
  private _pickNextMergeMove(): SortMove | null {
    if (!this._grid || !this._mergeTarget || this._mergeColor === null) return null;
    for (const source of this._mergeSources) {
      if (this._grid.getTopColor(source.col, source.row) === this._mergeColor) {
        return { source, target: this._mergeTarget, color: this._mergeColor };
      }
    }
    return null;
  }

  private _startSortMove(move: SortMove): void {
    if (!this._grid || !this._sfx) return;
    const popped = this._grid.popTop(move.source.col, move.source.row);
    if (popped === null) return;
    this._grid.pushTop(move.target.col, move.target.row, move.color);

    // SFX 1: the tile is leaving the source stack.
    this._sfx.playMoveStart();

    if (!this._view) return;
    this._animating = true;
    this._view.animateBlockMove(
      move.source.col,
      move.source.row,
      move.target.col,
      move.target.row,
      move.color,
      () => this._onSortMoveAnimComplete(),
    );
  }

  private _onSortMoveAnimComplete(): void {
    this._animating = false;
    this._timeAccum = 0;
    // SFX 2: the tile has just settled onto the target stack.
    this._sfx?.playTileLand();
    // Tighten post-move transitions: if the iteration is exhausted,
    // immediately rescan + cooldown so the next step starts sooner.
    if (!this._pickNextMergeMove()) this._onMergeIterationDone();
  }

  private _onMergeIterationDone(): void {
    this._mergeTarget = null;
    this._mergeColor = null;
    this._mergeSources = [];
    // Grid-wide re-evaluation: every merge operation triggers a full scan
    // so matches created anywhere on the board become triggers.
    this._rescanAndEnqueue();
    this._enterCooldown();
  }

  private _onCooldownElapsed(): void {
    this._phase = "idle";
    this._tryStartNext();
  }

  // --- Destruction steps -------------------------------------------------

  private _onDestroyStep(): void {
    if (!this._grid) {
      this._onDestructionIterationDone();
      return;
    }
    const cell = this._destroyCell;
    const color = this._destroyColor;
    if (!cell || color === null) {
      this._onDestructionIterationDone();
      return;
    }
    if (this._grid.getTopColor(cell.col, cell.row) !== color) {
      this._onDestructionComplete();
      return;
    }
    this._startDestroyStep(cell);
  }

  private _startDestroyStep(cell: HexCoord): void {
    if (!this._grid || !this._sfx) return;
    this._grid.popTop(cell.col, cell.row);
    // SFX 3: one pop per destroyed tile — fires at the start of each
    // 0.1s destruction step, so rapid cascades sound as a natural burst.
    this._sfx.playTileDestroy();
    if (!this._view) return;
    this._animating = true;
    this._view.animateBlockDestroy(cell.col, cell.row, () => {
      this._animating = false;
      this._timeAccum = 0;
    });
  }

  private _onDestructionComplete(): void {
    const cell = this._destroyCell;
    this._destroyCell = null;
    this._destroyColor = null;
    // The destroyed cell's revealed top may form new matches — enqueue it
    // first so the rescan's deterministic (col, row) order still treats
    // it as a primary trigger, then rescan for any other newly valid cells.
    if (cell) this._enqueueTrigger(cell);
    this._onDestructionIterationDone();
  }

  private _onDestructionIterationDone(): void {
    this._destroyCell = null;
    this._destroyColor = null;
    this._rescanAndEnqueue();
    this._enterCooldown();
  }

  // --- Helpers -----------------------------------------------------------

  private static _sameCell(a: HexCoord, b: HexCoord): boolean {
    return a.col === b.col && a.row === b.row;
  }

  private static _cellKey(col: number, row: number): number {
    return col * 1000 + row;
  }
}
