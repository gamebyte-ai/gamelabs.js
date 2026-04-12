import type { IGridAllocator } from "./IGridAllocator.js";
import type { Grid } from "../models/Grid.js";
import { GridCell } from "../models/GridCell.js";
import { GridItem } from "../models/GridItem.js";

export class DefaultGridAllocator implements IGridAllocator {
  public createCell(grid: Grid, col: number, row: number, _options: unknown): GridCell {
    return new GridCell(grid, col, row);
  }

  public createItem(options: unknown): GridItem {
    const id = typeof options === "object" && options !== null && "id" in options ? (options as { id: number }).id : 0;
    return new GridItem(id);
  }
}
