import type { Grid } from "./Grid.js";
import { GridEvents } from "../events/GridEvents.js";
import type { IGridsModel } from "./IGridsModel.js";
import type { IInjectionTarget } from "../../../../core/di/IInjectionTarget.js";
import type { IInstanceResolver } from "../../../../core/di/IInstanceResolver.js";

export class GridsModel implements IGridsModel, IInjectionTarget {
  private readonly _grids = new Map<number, Grid>();
  private _events: GridEvents | null = null;

  public inject(resolver: IInstanceResolver): void {
    this._events = resolver.getInstance(GridEvents);
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
