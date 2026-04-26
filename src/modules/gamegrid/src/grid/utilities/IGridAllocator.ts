import type { BaseGrid } from "../models/BaseGrid.js";
import type { GridCell } from "../models/GridCell.js";
import type { GridItem } from "../models/GridItem.js";

export interface IGridAllocator {
  /**
   * Construct a cell at `(col, row)` for `grid`. `capacity` is the
   * maximum stack depth (defaults to 1 for single-item cells). Apps that
   * need per-(col,row) capacity rules should subclass and override.
   */
  createCell(grid: BaseGrid, col: number, row: number, capacity?: number): GridCell;
  createItem(options: unknown): GridItem;
}
