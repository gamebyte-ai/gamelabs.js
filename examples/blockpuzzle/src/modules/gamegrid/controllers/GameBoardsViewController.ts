import type { GridCoord, IBaseGrid, IGridItem, IInstanceResolver, RectGrid, RectGridPreset } from "@gamebyte/gamelabsjs";
import { GridsModel, GridsViewController, UnsubscribeBag } from "@gamebyte/gamelabsjs";
import { BlockPuzzleConfig } from "../../../BlockPuzzleConfig";
import { ItemIdGenerator } from "../../../utilities/ItemIdGenerator";
import { LineClearRule } from "../../../utilities/LineClearRule";
import { PiecePlacementOperations } from "../../../utilities/PiecePlacementOperations";
import { PieceSpawnOperations } from "../../../utilities/PieceSpawnOperations";
import { GameBoardItem } from "../models/GameBoardItem";
import type { IGameBoardsView, PiecePlacementInfo } from "../views/IGameBoardsView";
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
 *
 * The view stays render-only and never touches the model — every
 * model mutation flows through this controller.
 */
export class GameBoardsViewController extends GridsViewController {
  private _config: BlockPuzzleConfig | null = null;
  private _gridsModel: GridsModel | null = null;
  private _ids: ItemIdGenerator | null = null;
  private _clearRule: LineClearRule | null = null;
  private _boardsView: IGameBoardsView | null = null;
  private readonly _ownSubs = new UnsubscribeBag();

  public override inject(resolver: IInstanceResolver): void {
    super.inject(resolver);
    this._config = resolver.getInstance(BlockPuzzleConfig);
    this._gridsModel = resolver.getInstance(GridsModel);
    this._ids = resolver.getInstance(ItemIdGenerator);
    this._clearRule = resolver.getInstance(LineClearRule);
  }

  public override initialize(view: IGameBoardsView): void {
    super.initialize(view);
    this._boardsView = view;
    view.setPlacementPredicate((footprint) => this._canPlace(footprint));
    view.setClearPreviewProvider((footprint) => this._predictClears(footprint));
    this._ownSubs.add(view.onPiecePlacement((info) => this._onPiecePlacement(info)));
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
    this._boardsView = null;
    this._config = null;
    this._gridsModel = null;
    this._ids = null;
    this._clearRule = null;
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
    return this._clearRule.computeClears(grid, footprint);
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
    // Clear any full rows/columns. computeClears runs against the
    // post-placement grid state — placedCells already in the model,
    // so the overlay clause in `LineClearRule.computeClears` is
    // redundant here but harmless, and gives the same answer the
    // view's predictive preview reported.
    const clears = this._clearRule.computeClears(grid, info.footprint);
    for (const { col, row } of clears) {
      grid.removeCellItem(col, row);
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
}
