import type { BaseGrid } from "./BaseGrid.js";
import type { GridItem } from "./GridItem.js";
import type { IGridCell } from "./IGridCell.js";

/**
 * A grid cell that holds a stack of items, bottom → top.
 *
 * `capacity` is fixed at construction (default 1 — single-item cells).
 * `item` is the top of the stack (or null if empty); `items` exposes the
 * full stack readonly. Mutation flows through `BaseGrid.addCellItem`,
 * `removeCellItem`, and `setCellItem` so back-references and events stay
 * consistent — direct calls to the internal `_addTop` / `_removeTop`
 * methods skip that bookkeeping.
 */
export class GridCell implements IGridCell {
  public readonly grid: BaseGrid;
  public readonly col: number;
  public readonly row: number;
  public readonly capacity: number;
  private readonly _items: GridItem[];

  public get items(): readonly GridItem[] {
    return this._items;
  }

  public get size(): number {
    return this._items.length;
  }

  public get item(): GridItem | null {
    return this._items[this._items.length - 1] ?? null;
  }

  public constructor(grid: BaseGrid, col: number, row: number, capacity: number = 1) {
    if (capacity < 1) throw new Error(`GridCell capacity must be >= 1 (got ${capacity}).`);
    this.grid = grid;
    this.col = col;
    this.row = row;
    this.capacity = capacity;
    this._items = [];
  }

  /** @internal Use {@link BaseGrid.addCellItem} — direct use skips back-reference bookkeeping and event emission. */
  public _addTop(item: GridItem): void {
    this._items.push(item);
  }

  /** @internal Use {@link BaseGrid.removeCellItem} — direct use skips back-reference bookkeeping and event emission. */
  public _removeTop(): GridItem | null {
    return this._items.pop() ?? null;
  }
}
