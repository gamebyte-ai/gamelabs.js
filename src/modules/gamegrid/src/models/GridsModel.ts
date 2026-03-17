import type { Grid } from "./Grid.js";
import type { GridEvents } from "../events/GridEvents.js";

export class GridsModel {
  private readonly _grids = new Map<number, Grid>();
  private readonly _events: GridEvents | null;

  public constructor(events: GridEvents | null = null) {
    this._events = events;
  }

  public getGrid(id: number): Grid | undefined {
    return this._grids.get(id);
  }

  public getGrids(): ReadonlyMap<number, Grid> {
    return this._grids;
  }

  public addGrid(grid: Grid): void {
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
