import type { GridPreset } from "gamelabsjs";
import { GridItemObjectOptions } from "gamelabsjs";

export class GameBoardItemObjectOptions extends GridItemObjectOptions {
  public readonly gemType: number;

  public constructor(itemId: number, gridPreset: GridPreset, gemType: number) {
    super(itemId, gridPreset);
    this.gemType = gemType;
  }
}
