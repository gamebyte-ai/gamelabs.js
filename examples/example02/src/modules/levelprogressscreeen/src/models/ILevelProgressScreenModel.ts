import { InjectionToken } from "gamelabsjs";

/**
 * Example02 level progress screen model contract.
 */
export interface ILevelProgressScreenModel {
  readonly visibleItemCount: number;
  readonly currentLevel: number;
}

/**
 * Runtime token for DI.
 */
export const ILevelProgressScreenModel = new InjectionToken<ILevelProgressScreenModel>("ILevelProgressScreenModel");

