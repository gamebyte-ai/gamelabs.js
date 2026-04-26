import type { Unsubscribe } from "../../../../../core/events/subscriptions.js";
import type { BaseGrid } from "../models/BaseGrid.js";
import type { GridCell } from "../models/GridCell.js";
import type { GridItem } from "../models/GridItem.js";
import type { Vector3 } from "../models/Vector3.js";

/**
 * Shape-agnostic grid events.
 *
 * Carries grid lifecycle events, transform changes, and per-cell stack
 * mutations for both rectangular and hexagonal grids. The grid arguments
 * are typed `BaseGrid`; subscribers that need shape-specific access cast
 * to `IRectGrid` / `IHexGrid` (or `RectGrid` / `HexGrid`) at the call
 * site.
 *
 * Item mutations fire as separate `itemAdded` / `itemRemoved` events
 * (one per item). `setCellItem` that replaces a multi-item stack emits
 * one `itemRemoved` per popped item followed by an `itemAdded` for the
 * new top.
 */
export class GridEvents {
  private readonly _gridAddedListeners = new Set<(grid: BaseGrid) => void>();
  private readonly _gridRemovedListeners = new Set<(grid: BaseGrid) => void>();
  private readonly _itemAddedListeners = new Set<(cell: GridCell, item: GridItem) => void>();
  private readonly _itemRemovedListeners = new Set<(cell: GridCell, item: GridItem) => void>();
  private readonly _positionChangedListeners = new Set<(grid: BaseGrid, position: Vector3) => void>();
  private readonly _rotationChangedListeners = new Set<(grid: BaseGrid, rotation: Vector3) => void>();

  public onGridAdded(cb: (grid: BaseGrid) => void): Unsubscribe {
    this._gridAddedListeners.add(cb);
    return () => this._gridAddedListeners.delete(cb);
  }

  public emitGridAdded(grid: BaseGrid): void {
    for (const cb of this._gridAddedListeners) cb(grid);
  }

  public onGridRemoved(cb: (grid: BaseGrid) => void): Unsubscribe {
    this._gridRemovedListeners.add(cb);
    return () => this._gridRemovedListeners.delete(cb);
  }

  public emitGridRemoved(grid: BaseGrid): void {
    for (const cb of this._gridRemovedListeners) cb(grid);
  }

  public onItemAdded(cb: (cell: GridCell, item: GridItem) => void): Unsubscribe {
    this._itemAddedListeners.add(cb);
    return () => this._itemAddedListeners.delete(cb);
  }

  public emitItemAdded(cell: GridCell, item: GridItem): void {
    for (const cb of this._itemAddedListeners) cb(cell, item);
  }

  public onItemRemoved(cb: (cell: GridCell, item: GridItem) => void): Unsubscribe {
    this._itemRemovedListeners.add(cb);
    return () => this._itemRemovedListeners.delete(cb);
  }

  public emitItemRemoved(cell: GridCell, item: GridItem): void {
    for (const cb of this._itemRemovedListeners) cb(cell, item);
  }

  public onPositionChanged(cb: (grid: BaseGrid, position: Vector3) => void): Unsubscribe {
    this._positionChangedListeners.add(cb);
    return () => this._positionChangedListeners.delete(cb);
  }

  public emitPositionChanged(grid: BaseGrid, position: Vector3): void {
    for (const cb of this._positionChangedListeners) cb(grid, position);
  }

  public onRotationChanged(cb: (grid: BaseGrid, rotation: Vector3) => void): Unsubscribe {
    this._rotationChangedListeners.add(cb);
    return () => this._rotationChangedListeners.delete(cb);
  }

  public emitRotationChanged(grid: BaseGrid, rotation: Vector3): void {
    for (const cb of this._rotationChangedListeners) cb(grid, rotation);
  }
}
