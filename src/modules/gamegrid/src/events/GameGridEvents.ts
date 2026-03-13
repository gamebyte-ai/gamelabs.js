import type { Unsubscribe } from "../../../../core/events/subscriptions.js";
import type { GameGridCell } from "../models/GameGridCell.js";
import type { GameGridItem } from "../models/GameGridItem.js";
import type { GameGrid } from "../models/GameGrid.js";
import type { Vector3 } from "../types/Vector3.js";

export class GameGridEvents {
  private readonly _gridAddedListeners = new Set<(grid: GameGrid) => void>();
  private readonly _gridRemovedListeners = new Set<(grid: GameGrid) => void>();
  private readonly _itemChangedListeners = new Set<(cell: GameGridCell, oldItem: GameGridItem | null, newItem: GameGridItem | null) => void>();
  private readonly _positionChangedListeners = new Set<(grid: GameGrid, position: Vector3) => void>();
  private readonly _rotationChangedListeners = new Set<(grid: GameGrid, rotation: Vector3) => void>();

  public onGridAdded(cb: (grid: GameGrid) => void): Unsubscribe {
    this._gridAddedListeners.add(cb);
    return () => this._gridAddedListeners.delete(cb);
  }

  public emitGridAdded(grid: GameGrid): void {
    for (const cb of this._gridAddedListeners) cb(grid);
  }

  public onGridRemoved(cb: (grid: GameGrid) => void): Unsubscribe {
    this._gridRemovedListeners.add(cb);
    return () => this._gridRemovedListeners.delete(cb);
  }

  public emitGridRemoved(grid: GameGrid): void {
    for (const cb of this._gridRemovedListeners) cb(grid);
  }

  public onItemChanged(cb: (cell: GameGridCell, oldItem: GameGridItem | null, newItem: GameGridItem | null) => void): Unsubscribe {
    this._itemChangedListeners.add(cb);
    return () => this._itemChangedListeners.delete(cb);
  }

  public emitItemChanged(cell: GameGridCell, oldItem: GameGridItem | null, newItem: GameGridItem | null): void {
    for (const cb of this._itemChangedListeners) cb(cell, oldItem, newItem);
  }

  public onPositionChanged(cb: (grid: GameGrid, position: Vector3) => void): Unsubscribe {
    this._positionChangedListeners.add(cb);
    return () => this._positionChangedListeners.delete(cb);
  }

  public emitPositionChanged(grid: GameGrid, position: Vector3): void {
    for (const cb of this._positionChangedListeners) cb(grid, position);
  }

  public onRotationChanged(cb: (grid: GameGrid, rotation: Vector3) => void): Unsubscribe {
    this._rotationChangedListeners.add(cb);
    return () => this._rotationChangedListeners.delete(cb);
  }

  public emitRotationChanged(grid: GameGrid, rotation: Vector3): void {
    for (const cb of this._rotationChangedListeners) cb(grid, rotation);
  }
}
