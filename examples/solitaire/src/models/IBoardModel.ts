import { InjectionToken } from "@gamebyte/gamelabsjs";
import type { IPile } from "./IPile";

export interface IBoardModel {
  readonly stock: IPile;
  readonly waste: IPile;
  readonly foundations: readonly IPile[];
  readonly tableau: readonly IPile[];
  readonly allPiles: readonly IPile[];
}

export const IBoardModel = new InjectionToken<IBoardModel>("IBoardModel");
