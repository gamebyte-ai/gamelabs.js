import { InjectionToken } from "../../../../core/di/InjectionToken.js";
import type { IGrid } from "./IGrid.js";

export interface IGridsModel {
  getGrid(id: number): IGrid | undefined;
  getGrids(): ReadonlyMap<number, IGrid>;
}

export const IGridsModel = new InjectionToken<IGridsModel>("IGridsModel");
