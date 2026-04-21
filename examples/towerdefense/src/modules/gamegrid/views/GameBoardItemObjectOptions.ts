import { GridItemObjectOptions, type GridPreset } from "@gamebyte/gamelabsjs";
import type { TowerTypeId } from "../../../constants/TowerTypeDef.js";

export class GameBoardItemObjectOptions extends GridItemObjectOptions {
  public readonly towerType: TowerTypeId;

  public constructor(itemId: number, gridPreset: GridPreset, towerType: TowerTypeId) {
    super(itemId, gridPreset);
    this.towerType = towerType;
  }
}
