import { Grid } from "./Grid.js";
import type { GridItem } from "./GridItem.js";

export class GridCell {
  //  FIELDS
  public readonly grid: Grid;
  public readonly col: number;
  public readonly row: number;
  private _item: GridItem | null;

  //  ACCESSORS
  public get item(): GridItem | null {
    return this._item;
  }

  //  CONSTRUCTOR
  public constructor(grid: Grid, col: number, row: number) {
    this.grid = grid;
    this.col = col;
    this.row = row;
    this._item = null;
  }

  //  METHODS
  public setItem(item: GridItem | null): void {
    this._item = item;
  }
}
