import type { ILevelProgressScreenModel } from "../modules/levelprogressscreeen/src/models/ILevelProgressScreenModel.js";

export class LevelProgressModel implements ILevelProgressScreenModel {
  readonly visibleItemCount = 5;
  readonly currentLevel = 2;
}

