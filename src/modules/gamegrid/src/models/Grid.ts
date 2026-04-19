import { vector } from "@js-basics/vector";
import type { GridCell } from "./GridCell.js";
import type { GridItem } from "./GridItem.js";
import { GridPreset } from "./GridPreset.js";
import type { GridEvents } from "../events/GridEvents.js";
import type { Vector3 } from "../constants/Vector3.js";
import type { IGridAllocator } from "../utilities/IGridAllocator.js";
import { DefaultGridAllocator } from "../utilities/DefaultGridAllocator.js";
import type { IGrid } from "./IGrid.js";

export class Grid implements IGrid {
  public readonly gridId: number;
  public readonly columnCount: number;
  public readonly rowCount: number;
  public readonly preset: GridPreset;
  private readonly _allocator: IGridAllocator;
  private readonly _cells: GridCell[][];
  private readonly _position: Vector3;
  private readonly _rotation: Vector3;
  private readonly _events: GridEvents | null;

  public get position(): Vector3 {
    return this._position;
  }

  public get rotation(): Vector3 {
    return this._rotation;
  }

  public constructor(
    gridId: number,
    columnCount: number,
    rowCount: number,
    events: GridEvents | null = null,
    preset: GridPreset | null = null,
    allocator: IGridAllocator | null = null,
  ) {
    this.gridId = gridId;
    this.columnCount = columnCount;
    this.rowCount = rowCount;
    this.preset = preset ?? new GridPreset();
    this._allocator = allocator ?? new DefaultGridAllocator();
    this._position = vector(0, 0, 0);
    this._rotation = vector(0, 0, 0);
    this._events = events;
    this._cells = [] as GridCell[][];
    for (let col = 0; col < columnCount; col++) {
      const colArr: GridCell[] = [];
      for (let row = 0; row < rowCount; row++) colArr.push(this._allocator.createCell(this, col, row, undefined));
      this._cells.push(colArr);
    }
  }

  public setPosition(v: Vector3): void {
    this._position.x = v.x;
    this._position.y = v.y;
    this._position.z = v.z;
    this._events?.emitPositionChanged(this, this._position);
  }

  public setRotation(v: Vector3): void {
    this._rotation.x = v.x;
    this._rotation.y = v.y;
    this._rotation.z = v.z;
    this._events?.emitRotationChanged(this, this._rotation);
  }

  public getCell(col: number, row: number): GridCell | null {
    return this._cells[col]?.[row] ?? null;
  }

  public getCellSafe(col: number, row: number): GridCell | null {
    if (col < 0 || col >= this.columnCount || row < 0 || row >= this.rowCount) return null;
    const c = this._cells[col]!;
    return c[row] ?? null;
  }

  public setCellItem(col: number, row: number, item: GridItem | null): void {
    const cell = this._cells[col]![row]!;
    const oldItem = cell.item;
    if (oldItem === item) return;

    if (item && item.cell && item.cell !== cell) {
      throw new Error(`GridItem ${item.itemId} is already attached to a cell. Detach it first with setCellItem(prevCol, prevRow, null).`);
    }

    if (oldItem) oldItem.setCell(null);
    cell.setItem(item);
    if (item) item.setCell(cell);

    this._events?.emitItemChanged(cell, oldItem, item);
  }
}
