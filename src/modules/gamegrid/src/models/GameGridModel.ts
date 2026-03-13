import type { GameGrid } from "./GameGrid.js";
import type { GameGridEvents } from "../events/GameGridEvents.js";

export class GameGridModel {
  private readonly _grids = new Map<number, GameGrid>();
  private readonly _events: GameGridEvents | null;

  public constructor(events: GameGridEvents | null = null) {
    this._events = events;
  }

  public getGrid(id: number): GameGrid | undefined {
    return this._grids.get(id);
  }

  public getGrids(): ReadonlyMap<number, GameGrid> {
    return this._grids;
  }

  public addGrid(grid: GameGrid): void {
    this._grids.set(grid.gridId, grid);
    this._events?.emitGridAdded(grid);
  }

  public removeGrid(id: number): void {
    const grid = this._grids.get(id);
    if (grid) {
      this._grids.delete(id);
      this._events?.emitGridRemoved(grid);
    }
  }
}
