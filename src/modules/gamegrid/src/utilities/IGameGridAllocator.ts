import type { GameGrid } from "../models/GameGrid.js";
import type { GameGridCell } from "../models/GameGridCell.js";
import type { GameGridItem } from "../models/GameGridItem.js";

export interface IGameGridAllocator {
  createCell(grid: GameGrid, col: number, row: number, options: any): GameGridCell;
  createItem(options: any): GameGridItem;
}
