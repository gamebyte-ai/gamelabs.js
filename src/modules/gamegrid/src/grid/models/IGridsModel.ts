import { InjectionToken } from "../../../../../core/di/InjectionToken.js";
import type { IBaseGrid } from "./IBaseGrid.js";

/**
 * Readonly view of the collection of grids in the app.
 *
 * Holds both rectangular and hexagonal grids by their shared
 * {@link IBaseGrid} surface; consumers that need shape-specific access
 * cast individual grids to `IRectGrid` / `IHexGrid` at the call site.
 */
export interface IGridsModel {
  getGrid(id: number): IBaseGrid | undefined;
  getGrids(): ReadonlyMap<number, IBaseGrid>;
}

export const IGridsModel = new InjectionToken<IGridsModel>("IGridsModel");
