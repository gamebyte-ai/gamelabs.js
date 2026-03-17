import type { ILevelProgressScreenModel } from "gamelabsjs";

export class LevelProgressModel implements ILevelProgressScreenModel {
  readonly visibleItemCount = 5;
  readonly currentLevel = 2;
}

