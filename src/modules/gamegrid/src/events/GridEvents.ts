import type { Unsubscribe } from "../../../../core/events/subscriptions.js";
import type { GridCell } from "../models/GridCell.js";
import type { GridItem } from "../models/GridItem.js";
import type { Grid } from "../models/Grid.js";
import type { Vector3 } from "../types/Vector3.js";

export class GridEvents {
  private readonly _gridAddedListeners = new Set<(grid: Grid) => void>();
  private readonly _gridRemovedListeners = new Set<(grid: Grid) => void>();
  private readonly _itemChangedListeners = new Set<(cell: GridCell, oldItem: GridItem | null, newItem: GridItem | null) => void>();
  private readonly _positionChangedListeners = new Set<(grid: Grid, position: Vector3) => void>();
  private readonly _rotationChangedListeners = new Set<(grid: Grid, rotation: Vector3) => void>();

  public onGridAdded(cb: (grid: Grid) => void): Unsubscribe {
    this._gridAddedListeners.add(cb);
    return () => this._gridAddedListeners.delete(cb);
  }

  public emitGridAdded(grid: Grid): void {
    for (const cb of this._gridAddedListeners) cb(grid);
  }

  public onGridRemoved(cb: (grid: Grid) => void): Unsubscribe {
    this._gridRemovedListeners.add(cb);
    return () => this._gridRemovedListeners.delete(cb);
  }

  public emitGridRemoved(grid: Grid): void {
    for (const cb of this._gridRemovedListeners) cb(grid);
  }

  public onItemChanged(cb: (cell: GridCell, oldItem: GridItem | null, newItem: GridItem | null) => void): Unsubscribe {
    this._itemChangedListeners.add(cb);
    return () => this._itemChangedListeners.delete(cb);
  }

  public emitItemChanged(cell: GridCell, oldItem: GridItem | null, newItem: GridItem | null): void {
    for (const cb of this._itemChangedListeners) cb(cell, oldItem, newItem);
  }

  public onPositionChanged(cb: (grid: Grid, position: Vector3) => void): Unsubscribe {
    this._positionChangedListeners.add(cb);
    return () => this._positionChangedListeners.delete(cb);
  }

  public emitPositionChanged(grid: Grid, position: Vector3): void {
    for (const cb of this._positionChangedListeners) cb(grid, position);
  }

  public onRotationChanged(cb: (grid: Grid, rotation: Vector3) => void): Unsubscribe {
    this._rotationChangedListeners.add(cb);
    return () => this._rotationChangedListeners.delete(cb);
  }

  public emitRotationChanged(grid: Grid, rotation: Vector3): void {
    for (const cb of this._rotationChangedListeners) cb(grid, rotation);
  }
}
