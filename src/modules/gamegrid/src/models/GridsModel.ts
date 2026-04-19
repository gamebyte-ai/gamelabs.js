import type { Grid } from "./Grid.js";
import type { GridEvents } from "../events/GridEvents.js";
import type { IGridsModel } from "./IGridsModel.js";

export class GridsModel implements IGridsModel {
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
    if (this._grids.has(grid.gridId)) {
      throw new Error(`Grid id already exists: ${grid.gridId}. Call removeGrid() before re-adding.`);
    }
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
