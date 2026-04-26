import type { GridCell } from "./GridCell.js";
import type { IGridItem } from "./IGridItem.js";

export class GridItem implements IGridItem {
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
  /** @internal Use {@link RectGrid.setCellItem} — direct use skips back-reference bookkeeping. */
  public setCell(cell: GridCell | null): void {
    this._cell = cell;
  }
}
