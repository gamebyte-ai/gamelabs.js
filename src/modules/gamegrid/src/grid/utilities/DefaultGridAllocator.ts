import type { BaseGrid } from "../models/BaseGrid.js";
import { GridCell } from "../models/GridCell.js";
import { GridItem } from "../models/GridItem.js";
import type { IGridAllocator } from "./IGridAllocator.js";

export class DefaultGridAllocator implements IGridAllocator {
  public createCell(grid: BaseGrid, col: number, row: number, capacity: number = 1): GridCell {
    return new GridCell(grid, col, row, capacity);
  }

  public createItem(options: unknown): GridItem {
    const id = typeof options === "object" && options !== null && "id" in options ? (options as { id: number }).id : 0;
    return new GridItem(id);
  }
}
