import { GameGrid } from "./GameGrid.js";
import type { GameGridItem } from "./GameGridItem.js";

export class GameGridCell {
  //  FIELDS
  public readonly grid: GameGrid;
  public readonly col: number;
  public readonly row: number;
  private _item: GameGridItem | null;

  //  ACCESSORS
  public get item(): GameGridItem | null {
    return this._item;
  }

  //  CONSTRUCTOR
  public constructor(grid: GameGrid, col: number, row: number) {
    this.grid = grid;
    this.col = col;
    this.row = row;
    this._item = null;
  }

  //  METHODS
  public setItem(item: GameGridItem | null): void {
    this._item = item;
  }
}
