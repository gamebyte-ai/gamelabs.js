export interface IGameGridObjectPointerListener {
    onGridPointerDown(gridId: number, event: PointerEvent): void;
    onGridPointerUp(gridId: number, event: PointerEvent): void;
    onGridCellPointerDown(gridId: number, col: number, row: number, event: PointerEvent): void;
    onGridCellPointerUp(gridId: number, col: number, row: number, event: PointerEvent): void;
    onGridItemPointerDown(itemId: number, event: PointerEvent): void;
    onGridItemPointerUp(itemId: number, event: PointerEvent): void;
  }
  