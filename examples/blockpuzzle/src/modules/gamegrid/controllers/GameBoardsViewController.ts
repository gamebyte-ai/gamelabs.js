import type { GridCoord, IBaseGrid, IGridItem, IInstanceResolver, RectGrid, RectGridPreset } from "@gamebyte/gamelabsjs";
import { GridEvents, GridsModel, GridsViewController, UnsubscribeBag } from "@gamebyte/gamelabsjs";
import { BlockPuzzleConfig } from "../../../BlockPuzzleConfig";
import { GameState } from "../../../constants/GameState";
import { GameStateModel } from "../../../models/GameStateModel";
import { ScoreModel } from "../../../models/ScoreModel";
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
  private _boardsView: IGameBoardsView | null = null;
  /** Coalescing flag for {@link _scheduleRecompute}. A single
   *  `_onPiecePlacement` commit fires N+1+M+K grid events; we want
   *  one recompute at the end, not per-event. */
  private _recomputePending = false;
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
    this._boardsView?.setPlacementPredicate(null);
    this._boardsView?.setClearPreviewProvider(null);
    this._boardsView?.setTrayPlaceability(null);
    this._boardsView?.setDragEnabled(true);
    this._boardsView = null;
    this._config = null;
    this._gridsModel = null;
    this._gridEvents = null;
    this._ids = null;
    this._clearRule = null;
    this._gameState = null;
    this._scoreModel = null;
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

    const gameOver = anyOccupied && !anyPlaceable;
    if (gameOver) this._gameState.setState(GameState.GameOver);
    view.setDragEnabled(!gameOver);
  }
}
