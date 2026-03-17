import { GridsView } from "gamelabsjs";

export class GameGridsView extends GridsView {
  private _cellPointerDownHandler: ((gridId: number, col: number, row: number) => void) | null = null;

  public setCellPointerDownHandler(handler: ((gridId: number, col: number, row: number) => void) | null): void {
    this._cellPointerDownHandler = handler;
  }

  public override onGridCellPointerDown(gridId: number, col: number, row: number, _event: PointerEvent): void {
    this._cellPointerDownHandler?.(gridId, col, row);
  }
}
