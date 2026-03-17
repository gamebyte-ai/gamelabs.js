import type { IGridAllocator } from "./IGridAllocator.js";
import type { Grid } from "../models/Grid.js";
import { GridCell } from "../models/GridCell.js";
import { GridItem } from "../models/GridItem.js";

export class DefaultGridAllocator implements IGridAllocator {
  public createCell(grid: Grid, col: number, row: number, _options: any): GridCell {
    return new GridCell(grid, col, row);
  }

  public createItem(options: any): GridItem {
    return new GridItem(options?.id ?? 0);
  }
}
