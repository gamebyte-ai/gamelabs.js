import type { IBaseGrid, IGridItem, IInstanceResolver, RectGrid, RectGridPreset } from "@gamebyte/gamelabsjs";
import { GridsModel, GridsViewController, UnsubscribeBag } from "@gamebyte/gamelabsjs";
import { BlockPuzzleConfig, type PieceCells } from "../../../BlockPuzzleConfig";
import { ItemIdGenerator } from "../../../utilities/ItemIdGenerator";
import { PiecePlacementOperations } from "../../../utilities/PiecePlacementOperations";
import { PieceSpawnOperations } from "../../../utilities/PieceSpawnOperations";
import { GameBoardItem } from "../models/GameBoardItem";
import type { IGameBoardsView, PiecePlacementInfo } from "../views/IGameBoardsView";
import { GameBoardItemObjectOptions } from "../views/GameBoardItemObjectOptions";

/** Grid items render as a single block; tray items render as the
 *  full piece shape. The `[[0, 0]]` constant is reused by every
 *  grid spawn — sharing the readonly tuple is safe. */
const SINGLE_BLOCK_CELLS: PieceCells = [[0, 0]];

/**
 * Boards view controller — extends the framework's
 * {@link GridsViewController} with:
 *
 * - per-surface item-options construction (tray = full piece shape,
 *   grid = single block); the visual stays generic
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
  private _boardsView: IGameBoardsView | null = null;
  private readonly _ownSubs = new UnsubscribeBag();

  public override inject(resolver: IInstanceResolver): void {
    super.inject(resolver);
    this._config = resolver.getInstance(BlockPuzzleConfig);
    this._gridsModel = resolver.getInstance(GridsModel);
    this._ids = resolver.getInstance(ItemIdGenerator);
  }

  public override initialize(view: IGameBoardsView): void {
    super.initialize(view);
    this._boardsView = view;
    view.setPlacementPredicate((footprint) => this._canPlace(footprint));
    this._ownSubs.add(view.onPiecePlacement((info) => this._onPiecePlacement(info)));
  }

  protected override createItemObjectOption(item: IGridItem, grid: IBaseGrid): GameBoardItemObjectOptions {
    if (!(item instanceof GameBoardItem)) {
      throw new Error("GameBoardsViewController: expected GameBoardItem");
    }
    if (!this._config) {
      throw new Error("GameBoardsViewController: config not injected");
    }
    const isTray = grid.gridId === this._config.boardIds.tray;
    const cells = isTray ? item.pieceType.cells : SINGLE_BLOCK_CELLS;
    const blockSize = this._config.blockSizeFor(grid.gridId);
    // `grid.preset` is typed as the shape-agnostic `IGridPreset` on
    // the base controller. Both surfaces here use `RectGridPreset`,
    // and the item visual's `preset` is `declare`d as `RectGridPreset`
    // for that reason — so a narrowing cast at the seam is what the
    // framework expects.
    return new GameBoardItemObjectOptions(item.itemId, grid.preset as RectGridPreset, item, cells, item.color, blockSize);
  }

  public override destroy(): void {
    this._ownSubs.flush();
    this._boardsView?.setPlacementPredicate(null);
    this._boardsView = null;
    this._config = null;
    this._gridsModel = null;
    this._ids = null;
    super.destroy();
  }

  /**
   * Validity gate for both the drag-time ghost colouring and the
   * drop-time commit decision. Delegates the bounds + empty checks
   * to {@link PiecePlacementOperations.canPlace}; returns `false`
   * when the playing grid isn't registered (defensive — should
   * always be present after `BlockPuzzleApp.postInitialize`).
   */
  private _canPlace(footprint: readonly { col: number; row: number }[]): boolean {
    if (!this._gridsModel || !this._config) return false;
    const grid = this._gridsModel.getGrid(this._config.boardIds.grid);
    if (!grid) return false;
    return PiecePlacementOperations.canPlace(grid, footprint);
  }

  /**
   * Commit a valid drop. The view has already validated via the
   * predicate; we re-resolve the grids here from the model so we
   * mutate the source of truth, then run the placement op (creates
   * N grid items), remove the tray item (empties the slot), and
   * refill the tray with a fresh hand if every slot is now empty.
   * Each mutation fires framework events that the base controller
   * turns into view updates.
   */
  private _onPiecePlacement(info: PiecePlacementInfo): void {
    if (!this._gridsModel || !this._config || !this._ids) return;
    const grid = this._gridsModel.getGrid(this._config.boardIds.grid) as RectGrid | undefined;
    const tray = this._gridsModel.getGrid(this._config.boardIds.tray) as RectGrid | undefined;
    if (!grid || !tray) return;
    PiecePlacementOperations.place(grid, info.footprint, info.item.pieceType, info.item.color, this._ids);
    tray.removeCellItem(info.trayCol, 0);
    if (GameBoardsViewController._isTrayEmpty(tray)) {
      PieceSpawnOperations.dealHand(tray, this._config.pieceTypes, this._config.blockColors, this._ids);
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
