import type { IInjectionTarget } from "../../../../../core/di/IInjectionTarget.js";
import type { IInstanceResolver } from "../../../../../core/di/IInstanceResolver.js";
import type { BaseGrid } from "./BaseGrid.js";
import { GridEvents } from "../events/GridEvents.js";
import type { IGridsModel } from "./IGridsModel.js";

/**
 * Collection of grids keyed by `gridId`.
 *
 * Holds both rectangular and hexagonal grids as `BaseGrid` instances.
 * The shape-specific access (preset, hexSize, geometry) lives on each
 * grid's concrete class — callers that need it cast as appropriate.
 *
 * Mutations (`addGrid`, `removeGrid`) emit through the injected
 * {@link GridEvents}; same shape-agnostic event payloads regardless of
 * which grid type was added or removed.
 */
export class GridsModel implements IGridsModel, IInjectionTarget {
  private readonly _grids = new Map<number, BaseGrid>();
  private _events: GridEvents | null = null;

  public inject(resolver: IInstanceResolver): void {
    this._events = resolver.getInstance(GridEvents);
  }

  public getGrid(id: number): BaseGrid | undefined {
    return this._grids.get(id);
  }

  public getGrids(): ReadonlyMap<number, BaseGrid> {
    return this._grids;
  }

  public addGrid(grid: BaseGrid): void {
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
