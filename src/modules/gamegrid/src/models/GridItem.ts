import type { GridCell } from "./GridCell";

export class GridItem {
  //  FIELDS
  public readonly itemId: number;
  private _cell: GridCell | null;

  //  ACCESSORS
  public get cell(): GridCell | null {
    return this._cell;
  }

  //  CONSTRUCTOR
  public constructor(itemId: number) {
    this.itemId = itemId;
    this._cell = null;
  }

  //  METHODS
  public setCell(cell: GridCell): void {
    this._cell = cell;
  }
}
