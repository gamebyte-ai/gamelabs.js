import { vector } from "@js-basics/vector";
import { DefaultGridAllocator } from "../utilities/DefaultGridAllocator.js";
import type { BaseGridPreset } from "./BaseGridPreset.js";
import type { GridBounds } from "./GridBounds.js";
import type { GridCell } from "./GridCell.js";
import type { GridCoord } from "./GridCoord.js";
import type { GridEvents } from "../events/GridEvents.js";
import type { GridItem } from "./GridItem.js";
import type { IBaseGrid } from "./IBaseGrid.js";
import type { IGridAllocator } from "../utilities/IGridAllocator.js";
import type { Vector3 } from "./Vector3.js";

/**
 * Abstract base for grid models.
 *
 * Owns shared state — `gridId`, `position`, `rotation`, the cell array,
 * and the optional events object — and delegates the `IGridPreset`
 * surface (counts, cell-position math, neighbor traversal, bounds) to
 * the composed `preset`. Concrete subclasses (`RectGrid`, `HexGrid`)
 * declare their concrete preset type via the {@link preset} field.
 *
 * Cells hold a stack of items (capacity 1 by default — single-item
 * cells behave identically to a non-stacked model). Mutation flows
 * through three methods:
 *
 * - {@link addCellItem} pushes onto the top; throws on overflow or if
 *   the item is already attached to another cell.
 * - {@link removeCellItem} pops the top; returns the removed item (or
 *   `null` if the cell was empty).
 * - {@link setCellItem} replaces the entire stack — equivalent to
 *   removing every item and then (when `item` is non-null) adding the
 *   new one. With a capacity-1 cell this is an atomic single-item swap,
 *   identical to the previous shape of the API.
 *
 * Each push/pop emits one `itemAdded` / `itemRemoved` event on the
 * injected {@link GridEvents}. `setCellItem` replacing a stack of N
 * items therefore emits N `itemRemoved` events followed by at most one
 * `itemAdded`.
 */
export abstract class BaseGrid implements IBaseGrid {
  public readonly gridId: number;
  public abstract readonly preset: BaseGridPreset;
  protected readonly _position: Vector3;
  protected readonly _rotation: Vector3;
  protected readonly _cells: GridCell[][];
  protected readonly _events: GridEvents | null;

  public constructor(gridId: number, preset: BaseGridPreset, events: GridEvents | null = null, allocator: IGridAllocator | null = null) {
    this.gridId = gridId;
    this._events = events;
    this._position = vector(0, 0, 0);
    this._rotation = vector(0, 0, 0);
    const alloc = allocator ?? new DefaultGridAllocator();
    this._cells = [];
    for (let col = 0; col < preset.columnCount; col++) {
      const colArr: GridCell[] = [];
      for (let row = 0; row < preset.rowCount; row++) {
        colArr.push(alloc.createCell(this, col, row));
      }
      this._cells.push(colArr);
    }
  }

  public get columnCount(): number {
    return this.preset.columnCount;
  }

  public get rowCount(): number {
    return this.preset.rowCount;
  }

  public get directionCount(): number {
    return this.preset.directionCount;
  }

  public get position(): Vector3 {
    return this._position;
  }

  public get rotation(): Vector3 {
    return this._rotation;
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
    if (!this.isValidCell(col, row)) return null;
    const c = this._cells[col]!;
    return c[row] ?? null;
  }

  public addCellItem(col: number, row: number, item: GridItem): void {
    const cell = this._cells[col]![row]!;
    if (item.cell && item.cell !== cell) {
      throw new Error(`GridItem ${item.itemId} is already attached to a cell. Detach it first with removeCellItem(prevCol, prevRow).`);
    }
    if (item.cell === cell) return;
    if (cell.size >= cell.capacity) {
      throw new Error(`Cell (${col}, ${row}) is full (capacity ${cell.capacity}).`);
    }
    cell._addTop(item);
    item.setCell(cell);
    this._events?.emitItemAdded(cell, item);
  }

  public removeCellItem(col: number, row: number): GridItem | null {
    const cell = this._cells[col]![row]!;
    const removed = cell._removeTop();
    if (!removed) return null;
    removed.setCell(null);
    this._events?.emitItemRemoved(cell, removed);
    return removed;
  }

  public setCellItem(col: number, row: number, item: GridItem | null): void {
    const cell = this._cells[col]![row]!;
    if (item && item.cell && item.cell !== cell) {
      throw new Error(`GridItem ${item.itemId} is already attached to a cell. Detach it first with removeCellItem(prevCol, prevRow).`);
    }
    if (item === null && cell.size === 0) return;
    if (item !== null && cell.size === 1 && cell.item === item) return;

    while (cell.size > 0) {
      const popped = cell._removeTop()!;
      popped.setCell(null);
      this._events?.emitItemRemoved(cell, popped);
    }

    if (item) {
      cell._addTop(item);
      item.setCell(cell);
      this._events?.emitItemAdded(cell, item);
    }
  }

  // IGridPreset — delegated to the composed preset.

  public isValidCell(col: number, row: number): boolean {
    return this.preset.isValidCell(col, row);
  }

  public getCellPosition(col: number, row: number): Vector3 {
    return this.preset.getCellPosition(col, row);
  }

  public getBounds(): GridBounds {
    return this.preset.getBounds();
  }

  public getCenterOffset(): Vector3 {
    return this.preset.getCenterOffset();
  }

  public getNeighbor(col: number, row: number, direction: number): GridCoord | null {
    return this.preset.getNeighbor(col, row, direction);
  }

  public getOppositeDirection(direction: number): number {
    return this.preset.getOppositeDirection(direction);
  }

  public getAllNeighbors(col: number, row: number): GridCoord[] {
    return this.preset.getAllNeighbors(col, row);
  }
}
