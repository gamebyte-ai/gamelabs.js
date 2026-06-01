import type { GridCoord, IBaseGrid, IGridItem, IInstanceResolver, RectGrid, RectGridPreset } from "@gamebyte/gamelabsjs";
import {
  GridEvents,
  GridsModel,
  GridsViewController,
  ParticleManager,
  UnsubscribeBag,
  UpdateManager,
} from "@gamebyte/gamelabsjs";
import { BlockPuzzleConfig } from "../../../BlockPuzzleConfig";
import { GameState } from "../../../constants/GameState";
import { BoosterPanelState } from "../../../constants/BoosterPanelState";
import { BoosterType } from "../../../constants/BoosterType";
import { BoosterPanelModel } from "../../../models/BoosterPanelModel";
import { ComboModel } from "../../../models/ComboModel";
import { GameStateModel } from "../../../models/GameStateModel";
import { ScoreModel } from "../../../models/ScoreModel";
import { TrayPlaceabilityModel } from "../../../models/TrayPlaceabilityModel";
import { ItemIdGenerator } from "../../../utilities/ItemIdGenerator";
import { LineClearRule } from "../../../utilities/LineClearRule";
import { PiecePlacementOperations } from "../../../utilities/PiecePlacementOperations";
import { PieceSpawnOperations } from "../../../utilities/PieceSpawnOperations";
import { GameBoardItem } from "../models/GameBoardItem";
import type { IGameBoardsView, PiecePlacementInfo, TrayPlaceability } from "../views/IGameBoardsView";
import { GameBoardItemObjectOptions } from "../views/GameBoardItemObjectOptions";

/**
 * Boards view controller — extends the framework's
 * {@link GridsViewController} with:
 *
 * - item-options construction that forwards `item.cells` straight
 *   to the visual (tray items already carry a rotated full shape;
 *   grid items already carry a single-block layout — set by the
 *   spawner / placement op respectively)
 * - drag-driven placement: installs the validity predicate on the
 *   view, listens for the view's `onPiecePlacement` event, and
 *   commits the model mutation via {@link PiecePlacementOperations}
 * - per-placement recompute of tray placeability + game-over state:
 *   after every grid mutation (placement / clear / refill), each
 *   tray piece is tested against the post-mutation grid; unplaceable
 *   pieces fade on the view; once every non-empty slot is
 *   unplaceable, `GameState.GameOver` fires and drag is disabled.
 *
 * The view stays render-only and never touches the model — every
 * model mutation flows through this controller.
 */
export class GameBoardsViewController extends GridsViewController {
  private _config: BlockPuzzleConfig | null = null;
  private _gridsModel: GridsModel | null = null;
  private _gridEvents: GridEvents | null = null;
  private _ids: ItemIdGenerator | null = null;
  private _clearRule: LineClearRule | null = null;
  private _gameState: GameStateModel | null = null;
  private _scoreModel: ScoreModel | null = null;
  private _comboModel: ComboModel | null = null;
  private _boosterPanel: BoosterPanelModel | null = null;
  private _placeabilityModel: TrayPlaceabilityModel | null = null;
  private _boardsView: IGameBoardsView | null = null;
  private _particleManager: ParticleManager | null = null;
  private _updateManager: UpdateManager | null = null;
  /** Coalescing flag for {@link _scheduleRecompute}. A single
   *  `_onPiecePlacement` commit fires N+1+M+K grid events; we want
   *  one recompute at the end, not per-event. */
  private _recomputePending = false;
  /** Hammer wobble lifecycle. While Hammer Selecting is active, the
   *  per-frame tick increments `_wobbleTime` and pushes it to the
   *  view; on exit the controller pushes `null` once to snap blocks
   *  back to rest. Tracked here (not on the booster panel) because
   *  it's a view-pacing concern, not a model state. */
  private _wobbleActive = false;
  private _wobbleTime = 0;
  private readonly _ownSubs = new UnsubscribeBag();

  public override inject(resolver: IInstanceResolver): void {
    super.inject(resolver);
    this._config = resolver.getInstance(BlockPuzzleConfig);
    this._gridsModel = resolver.getInstance(GridsModel);
    this._gridEvents = resolver.getInstance(GridEvents);
    this._ids = resolver.getInstance(ItemIdGenerator);
    this._clearRule = resolver.getInstance(LineClearRule);
    this._gameState = resolver.getInstance(GameStateModel);
    this._scoreModel = resolver.getInstance(ScoreModel);
    this._comboModel = resolver.getInstance(ComboModel);
    this._boosterPanel = resolver.getInstance(BoosterPanelModel);
    this._placeabilityModel = resolver.getInstance(TrayPlaceabilityModel);
    this._particleManager = resolver.getInstance(ParticleManager);
    this._updateManager = resolver.getInstance(UpdateManager);
  }

  public override initialize(view: IGameBoardsView): void {
    super.initialize(view);
    this._boardsView = view;
    view.setPlacementPredicate((footprint) => this._canPlace(footprint));
    view.setClearPreviewProvider((footprint) => this._predictClears(footprint));
    this._ownSubs.add(view.onPiecePlacement((info) => this._onPiecePlacement(info)));
    // Recompute tray placeability + game-over after grid mutations.
    // Subscribes go through {@link _scheduleRecompute} so a multi-
    // step commit (place + tray remove + line clears + refill) ends
    // up with one recompute over the **final** post-commit state,
    // not one per intermediate event. Reading mid-commit can latch
    // GameOver from a transient state where the line clear hasn't
    // run yet but the tray piece is already gone.
    if (this._gridEvents) {
      this._ownSubs.add(this._gridEvents.onItemAdded(() => this._scheduleRecompute()));
      this._ownSubs.add(this._gridEvents.onItemRemoved(() => this._scheduleRecompute()));
    }
    // Booster panel state shifts (consume → Charging, select →
    // Selecting, cancel → Ready) without any grid event, so
    // subscribe explicitly — the recompute updates the drag /
    // cell-tap gates AND can fire a deferred game-over that was
    // held off while the panel was Ready.
    if (this._boosterPanel) {
      this._ownSubs.add(this._boosterPanel.onChange(() => this._scheduleRecompute()));
    }
    // Grid-cell taps for booster target selection (Hammer). Wired
    // even when the panel isn't Selecting — the view's gate is the
    // master switch.
    this._ownSubs.add(view.onGridCellTapped((col, row) => this._handleGridCellTap(col, row)));
    // Initial renderer clear colour. `_recomputeTrayState` keeps it
    // in sync afterward (swaps to the `selecting` variant while a
    // target-selection booster is pending; reverts otherwise).
    if (this._config) view.setBackgroundColor(this._config.backgroundColors.default);

    // Particle pipeline — register the Hammer emitter so the
    // framework's `ParticleManager` ticks it every frame and bursts
    // get drawn / lifetimed correctly.
    if (this._particleManager) {
      this._particleManager.register(view.hammerEmitter);
    }

    // Per-frame wobble lifecycle — see `_onTick`. Single registration
    // for the lifetime of the controller; the tick gates on the
    // booster panel state internally.
    if (this._updateManager) {
      this._ownSubs.add(this._updateManager.register((dt) => this._onTick(dt)));
    }
  }

  protected override createItemObjectOption(item: IGridItem, grid: IBaseGrid): GameBoardItemObjectOptions {
    if (!(item instanceof GameBoardItem)) {
      throw new Error("GameBoardsViewController: expected GameBoardItem");
    }
    if (!this._config) {
      throw new Error("GameBoardsViewController: config not injected");
    }
    const blockSize = this._config.blockSizeFor(grid.gridId);
    // `grid.preset` is typed as the shape-agnostic `IGridPreset` on
    // the base controller. Both surfaces here use `RectGridPreset`,
    // and the item visual's `preset` is `declare`d as `RectGridPreset`
    // for that reason — so a narrowing cast at the seam is what the
    // framework expects.
    return new GameBoardItemObjectOptions(item.itemId, grid.preset as RectGridPreset, item, item.cells, item.color, blockSize);
  }

  public override destroy(): void {
    this._ownSubs.flush();
    if (this._particleManager && this._boardsView) {
      this._particleManager.unregister(this._boardsView.hammerEmitter);
    }
    this._boardsView?.setPlacementPredicate(null);
    this._boardsView?.setClearPreviewProvider(null);
    this._boardsView?.setTrayPlaceability(null);
    this._boardsView?.setDragEnabled(true);
    this._boardsView?.setHammerWobble(null);
    this._boardsView = null;
    this._config = null;
    this._gridsModel = null;
    this._gridEvents = null;
    this._ids = null;
    this._clearRule = null;
    this._gameState = null;
    this._scoreModel = null;
    this._comboModel = null;
    this._boosterPanel = null;
    this._placeabilityModel = null;
    this._particleManager = null;
    this._updateManager = null;
    super.destroy();
  }

  /**
   * Validity gate for both the drag-time ghost and the drop-time
   * commit. Delegates to {@link PiecePlacementOperations.canPlace};
   * after the view's clamp-into-bounds anchor, bounds are guaranteed
   * in, so the predicate reduces to "are all target cells empty?".
   */
  private _canPlace(footprint: readonly { col: number; row: number }[]): boolean {
    if (!this._gridsModel || !this._config) return false;
    const grid = this._gridsModel.getGrid(this._config.boardIds.grid);
    if (!grid) return false;
    return PiecePlacementOperations.canPlace(grid, footprint);
  }

  /**
   * Predictive clear-preview for the view's ghost. Runs the same
   * {@link LineClearRule.computeClears} the post-placement commit
   * uses, just with the candidate footprint treated as virtually
   * filled. So the highlight on the ghost exactly matches the
   * lines that will clear if the player drops here.
   */
  private _predictClears(footprint: readonly GridCoord[]): readonly GridCoord[] {
    if (!this._gridsModel || !this._config || !this._clearRule) return [];
    const grid = this._gridsModel.getGrid(this._config.boardIds.grid);
    if (!grid) return [];
    return this._clearRule.computeClears(grid, footprint).cells;
  }

  /**
   * Commit a valid drop. The view has already validated via the
   * predicate; we re-resolve the grids here from the model so we
   * mutate the source of truth, then run the placement op (creates
   * N grid items), remove the tray item (empties the slot), clear
   * any rows/columns that became full, and refill the tray if every
   * slot is now empty. Each mutation fires framework events that
   * the base controller turns into view updates.
   */
  private _onPiecePlacement(info: PiecePlacementInfo): void {
    if (!this._gridsModel || !this._config || !this._ids || !this._clearRule) return;
    const grid = this._gridsModel.getGrid(this._config.boardIds.grid) as RectGrid | undefined;
    const tray = this._gridsModel.getGrid(this._config.boardIds.tray) as RectGrid | undefined;
    if (!grid || !tray) return;
    PiecePlacementOperations.place(grid, info.footprint, info.item.pieceType, info.item.color, this._ids);
    tray.removeCellItem(info.trayCol, 0);
    // Score the placement: one award per cell of the piece's
    // footprint.
    this._scoreModel?.add(info.footprint.length * this._config.score.placedBlock);
    // Clear any full rows/columns. computeClears runs against the
    // post-placement grid state — placedCells already in the model,
    // so the overlay clause in `LineClearRule.computeClears` is
    // redundant here but harmless, and gives the same answer the
    // view's predictive preview reported.
    const clears = this._clearRule.computeClears(grid, info.footprint);
    for (const { col, row } of clears.cells) {
      grid.removeCellItem(col, row);
    }
    // Score the line clear: one award per full row + per full
    // column. A placement that completes both a row and a column at
    // once awards twice.
    const lineCount = clears.fullRows.length + clears.fullCols.length;
    if (lineCount > 0) {
      this._scoreModel?.add(lineCount * this._config.score.clearedLine);
    }
    // Combo streak: bump on any line clear, deplete one move on a
    // no-clear placement. The model handles the activate / extend /
    // deactivate state transitions; the HUD listens for changes.
    this._comboModel?.registerPlacement(lineCount > 0);
    // Booster panel charge: one stage per cleared row / column.
    // No-clear placements don't advance the bar (Charging keeps
    // its progress, Ready stays Ready).
    if (lineCount > 0) this._boosterPanel?.registerClear(lineCount);
    if (GameBoardsViewController._isTrayEmpty(tray)) {
      PieceSpawnOperations.dealHand(tray, this._config.pieceTypes, this._config.rotatedShapes, this._config.blockColors, this._ids);
    }
  }

  /** True iff every tray slot is currently empty. Single-row tray,
   *  so we walk row 0 only. */
  private static _isTrayEmpty(tray: IBaseGrid): boolean {
    for (let col = 0; col < tray.columnCount; col++) {
      const cell = tray.getCell(col, 0);
      if (cell !== null && cell.size > 0) return false;
    }
    return true;
  }

  /**
   * Queue a recompute to run after the current synchronous
   * mutation chain completes. Multiple calls within the same
   * microtask collapse to a single recompute, so a commit
   * sequence (place → remove tray → clear lines → refill) only
   * triggers one game-over check, evaluated against the final
   * grid + tray state.
   */
  private _scheduleRecompute(): void {
    if (this._recomputePending) return;
    this._recomputePending = true;
    queueMicrotask(() => {
      this._recomputePending = false;
      this._recomputeTrayState();
    });
  }

  /**
   * Walk every occupied tray slot, ask
   * {@link PiecePlacementOperations.hasAnyValidPlacement} whether
   * its piece can still go anywhere on the playing grid, and push
   * the per-slot placeable / unplaceable map to the view. Fires
   * `GameState.GameOver` (and disables drag) the moment every
   * occupied slot is unplaceable.
   *
   * Scheduled via {@link _scheduleRecompute} once per synchronous
   * commit chain, so the view's faded state and the game-over gate
   * always reflect the **final** post-commit grid + tray contents.
   */
  private _recomputeTrayState(): void {
    if (!this._gridsModel || !this._config || !this._boardsView || !this._gameState) return;
    const grid = this._gridsModel.getGrid(this._config.boardIds.grid);
    const tray = this._gridsModel.getGrid(this._config.boardIds.tray);
    if (!grid || !tray) return;

    const placeability = new Map<number, boolean>();
    let anyOccupied = false;
    let anyPlaceable = false;
    for (let col = 0; col < tray.columnCount; col++) {
      const cell = tray.getCell(col, 0);
      const item = cell?.item;
      if (!(item instanceof GameBoardItem)) continue;
      anyOccupied = true;
      const placeable = PiecePlacementOperations.hasAnyValidPlacement(grid, item.cells);
      placeability.set(col, placeable);
      if (placeable) anyPlaceable = true;
    }

    const view: IGameBoardsView = this._boardsView;
    view.setTrayPlaceability(placeability satisfies TrayPlaceability);
    this._placeabilityModel?.setHasPlaceable(anyPlaceable);

    // Game-over rule: the tray must be locked AND the booster panel
    // must NOT be Ready / Selecting. Both Ready and Selecting give
    // the player a way to recover with a booster, so the HUD shows
    // the "NO MOVES LEFT, USE BOOSTER!" prompt and the game
    // continues until the player consumes the booster
    // (`onChange` re-fires this recompute) without unlocking the
    // tray.
    const boosterCharging = this._boosterPanel === null || this._boosterPanel.state === BoosterPanelState.Charging;
    const gameOver = anyOccupied && !anyPlaceable && boosterCharging;
    // Only fire GameOver from Playing — otherwise a no-moves
    // condition that hits while we're already in TimeUp would
    // overwrite the time-up label.
    if (gameOver && this._gameState.state === GameState.Playing) {
      this._gameState.setState(GameState.GameOver);
    }

    // Drag + cell-tap gates derived from the same state:
    // - Drag enabled while not Selecting and not game-over.
    // - Cell-tap enabled only while in Selecting + Hammer (the only
    //   target-selection mechanic implemented). UnitBlock SELECTING
    //   leaves both flags off — only the X cancels.
    const isSelecting =
      this._boosterPanel !== null && this._boosterPanel.state === BoosterPanelState.Selecting;
    view.setDragEnabled(!gameOver && !isSelecting);
    view.setCellTapEnabled(
      isSelecting && this._boosterPanel?.selectedBooster === BoosterType.Hammer,
    );

    // Background dim: only while Selecting AND the pending booster
    // is a target-selection one. Tray Refresh consumes inline and
    // never reaches Selecting, so the check on `selectedBooster` is
    // belt-and-braces — keeps the rule explicit at the call site.
    const selected = this._boosterPanel?.selectedBooster ?? null;
    const dim =
      isSelecting && (selected === BoosterType.Hammer || selected === BoosterType.UnitBlock);
    const bgColors = this._config.backgroundColors;
    view.setBackgroundColor(dim ? bgColors.selecting : bgColors.default);
  }

  /**
   * Grid cell taps only matter during a Hammer target selection.
   * On a filled cell: spawn a coloured destruction burst at the
   * cell's world position (particles inherit the block's colour),
   * empty it, then consume the booster. On an empty cell: ignore
   * (Selecting state stays — player can try again or cancel).
   */
  private _handleGridCellTap(col: number, row: number): void {
    if (!this._boosterPanel || !this._gridsModel || !this._config) return;
    if (this._boosterPanel.state !== BoosterPanelState.Selecting) return;
    if (this._boosterPanel.selectedBooster !== BoosterType.Hammer) return;

    const grid = this._gridsModel.getGrid(this._config.boardIds.grid) as RectGrid | undefined;
    if (!grid) return;
    const cell = grid.getCellSafe(col, row);
    if (cell === null || cell.size === 0) return;

    // Read the destroyed block's colour off the model *before* the
    // remove call — `removeCellItem` drops the item and the view
    // disposes its visuals, so the colour would be unreadable by
    // the time we ask afterward.
    const item = cell.item;
    if (item instanceof GameBoardItem && this._boardsView) {
      this._boardsView.emitHammerBurst(col, row, item.color);
    }

    grid.removeCellItem(col, row);
    this._boosterPanel.consume();
  }

  /**
   * Per-frame Hammer wobble pacer. While the booster panel is in
   * Selecting with Hammer pending, accumulate time and push the
   * sample into the view. On the transition out of that state, push
   * `null` once so the view snaps every block back to rest, then
   * skip the per-frame work.
   */
  private _onTick(dt: number): void {
    const isHammerSelecting =
      this._boosterPanel !== null &&
      this._boosterPanel.state === BoosterPanelState.Selecting &&
      this._boosterPanel.selectedBooster === BoosterType.Hammer;

    if (!isHammerSelecting) {
      if (this._wobbleActive) {
        this._wobbleActive = false;
        this._wobbleTime = 0;
        this._boardsView?.setHammerWobble(null);
      }
      return;
    }

    if (!this._wobbleActive) {
      this._wobbleActive = true;
      this._wobbleTime = 0;
    }
    this._wobbleTime += dt;
    this._boardsView?.setHammerWobble(this._wobbleTime);
  }
}
