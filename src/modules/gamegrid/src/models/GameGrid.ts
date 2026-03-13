import { vector } from "@js-basics/vector";
import type { GameGridCell } from "./GameGridCell.js";
import type { GameGridItem } from "./GameGridItem.js";
import { GameGridPreset } from "./GameGridPreset.js";
import type { GameGridEvents } from "../events/GameGridEvents.js";
import type { Vector3 } from "../types/Vector3.js";
import type { IGameGridAllocator } from "../utilities/IGameGridAllocator.js";
import { DefaultGameGridAllocator } from "../utilities/DefaultGameGridAllocator.js";

export class GameGrid {
  public readonly gridId: number;
  public readonly columnCount: number;
  public readonly rowCount: number;
  public readonly preset: GameGridPreset;
  private readonly _allocator: IGameGridAllocator;
  private readonly _cells: GameGridCell[][];
  private readonly _position: Vector3;
  private readonly _rotation: Vector3;
  private readonly _events: GameGridEvents | null;

  public get position(): Vector3 {
    return this._position;
  }

  public get rotation(): Vector3 {
    return this._rotation;
  }

  public constructor(gridId: number, columnCount: number, rowCount: number, events: GameGridEvents | null = null, preset: GameGridPreset | null = null, allocator: IGameGridAllocator | null = null) {
    this.gridId = gridId;
    this.columnCount = columnCount;
    this.rowCount = rowCount;
    this.preset = preset ?? GameGridPreset.DEFAULT;
    this._allocator = allocator ?? new DefaultGameGridAllocator();
    this._position = vector(0, 0, 0);
    this._rotation = vector(0, 0, 0);
    this._events = events;
    this._cells = [] as GameGridCell[][];
    for (let col = 0; col < columnCount; col++) {
      const colArr: GameGridCell[] = [];
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

  public getCell(col: number, row: number): GameGridCell | null {
    return this._cells[col]?.[row] ?? null;
  }

  public getCellSafe(col: number, row: number): GameGridCell | null {
    if (col < 0 || col >= this.columnCount || row < 0 || row >= this.rowCount) return null;
    const c = this._cells[col]!;
    return c[row] ?? null;
  }

  public setCellItem(col: number, row: number, item: GameGridItem | null): void {
    const cell = this._cells[col]![row]!;
    const oldItem = cell.item;
    cell.setItem(item);
    this._events?.emitItemChanged(cell, oldItem, item);
  }
}
