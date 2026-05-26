import type { GridCoord, IBaseGrid, RectGrid } from "@gamebyte/gamelabsjs";
import type { PieceCells, PieceType } from "../BlockPuzzleConfig";
import { GameBoardItem } from "../modules/gamegrid/models/GameBoardItem";
import { ItemIdGenerator } from "./ItemIdGenerator";

/** Grid items occupy exactly one cell each, so their `cells` field
 *  is always a single-block layout. Sharing the readonly tuple
 *  across every grid item is safe. */
const SINGLE_BLOCK_CELLS: PieceCells = [[0, 0]];

/**
 * Piece-placement operations on top of the framework grid model.
 *
 * Footprint math is the bridge between the view (which knows where
 * the pointer is) and the rules (which know what's legal): the view
 * computes the candidate cells with {@link computeFootprint}, the
 * rule {@link canPlace} returns whether those cells are bounds-
 * valid and empty, and {@link place} writes one `GameBoardItem` per
 * cell into the grid (firing the framework's `onItemAdded` event for
 * each — the view renders them automatically).
 *
 * Step 3 wires drag-drop placement only; clear rules (full row /
 * column, region match, ...) plug in later through {@link IClearRule}.
 */
export class PiecePlacementOperations {
  /**
   * Map a piece anchored at `(anchorCol, anchorRow)` to the grid
   * cells it would occupy. The anchor is the cell aligned with the
   * piece's bounding-box top-left; cells of the placed piece are
   * `(anchorCol + c, anchorRow + r)` for each `(c, r)` in
   * `pieceCells`.
   *
   * The mapping intentionally mirrors {@link PieceMeshBuilder}'s
   * per-block layout so the ghost preview and the eventual placed
   * blocks line up to the cell.
   */
  public static computeFootprint(anchorCol: number, anchorRow: number, pieceCells: PieceCells): GridCoord[] {
    const out: GridCoord[] = [];
    for (const [c, r] of pieceCells) {
      out.push({ col: anchorCol + c, row: anchorRow + r });
    }
    return out;
  }

  /**
   * True iff every cell in `footprint` is in bounds and currently
   * empty. Both clauses are the bare-minimum Block Blast / 1010!
   * rule — variant rule sets (e.g. allow stacking, allow overlap on
   * same colour) drop in here without changing the call sites.
   */
  public static canPlace(grid: IBaseGrid, footprint: readonly GridCoord[]): boolean {
    for (const { col, row } of footprint) {
      if (!grid.isValidCell(col, row)) return false;
      const cell = grid.getCellSafe(col, row);
      if (cell === null) return false;
      if (cell.size > 0) return false;
    }
    return true;
  }

  /**
   * Write the piece into the grid as N `GameBoardItem`s, one per
   * footprint cell, all sharing the same `pieceType` and `color`.
   * Each `addCellItem` fires `onItemAdded`, so the framework
   * auto-renders each new grid block via `GameBoardsViewController`.
   */
  public static place(
    grid: RectGrid,
    footprint: readonly GridCoord[],
    pieceType: PieceType,
    color: number,
    ids: ItemIdGenerator,
  ): void {
    for (const { col, row } of footprint) {
      grid.addCellItem(col, row, new GameBoardItem(ids.allocate(), pieceType, SINGLE_BLOCK_CELLS, color));
    }
  }
}
