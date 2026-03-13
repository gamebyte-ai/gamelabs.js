import { GameGridCell } from "./GameGridCell";

export class GameGridItem{
  //  FIELDS
  public readonly itemId: number;
  private _cell: GameGridCell | null;

  //  ACCESSORS
  public get cell(): GameGridCell | null {
    return this._cell;
  }

  //  CONSTRUCTOR
  public constructor(itemId: number) {
    this.itemId = itemId;
    this._cell = null;
  }

  //  METHODS
  public setCell(cell:GameGridCell): void {
    this._cell = cell;
  }
}
