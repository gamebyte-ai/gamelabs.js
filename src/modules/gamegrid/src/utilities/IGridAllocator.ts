import type { Grid } from "../models/Grid.js";
import type { GridCell } from "../models/GridCell.js";
import type { GridItem } from "../models/GridItem.js";

export interface IGridAllocator {
  createCell(grid: Grid, col: number, row: number, options: unknown): GridCell;
  createItem(options: unknown): GridItem;
}
