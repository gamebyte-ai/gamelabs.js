import type { IGameGridAllocator } from "./IGameGridAllocator.js";
import type { GameGrid } from "../models/GameGrid.js";
import { GameGridCell } from "../models/GameGridCell.js";
import { GameGridItem } from "../models/GameGridItem.js";

export class DefaultGameGridAllocator implements IGameGridAllocator {
  public createCell(grid: GameGrid, col: number, row: number, _options: any): GameGridCell {
    return new GameGridCell(grid, col, row);
  }

  public createItem(options: any): GameGridItem {
    return new GameGridItem(options?.id ?? 0);
  }
}
