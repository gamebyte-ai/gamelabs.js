import { GameGridView } from "gamelabsjs";

export class TicTacToeGameGridView extends GameGridView {
  public override onGridCellPointerDown(gridId: number, col: number, row: number, _event: PointerEvent): void {
    console.log(`Grid cell pointer down: gridId=${gridId}, col=${col}, row=${row}`);
  }
}
