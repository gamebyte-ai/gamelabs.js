import { GridItem } from "gamelabsjs";

/**
 * Grid item for Match-3: unique `itemId` (gamegrid) + `gemType` for match/color logic.
 */
export class Match3GridItem extends GridItem {
  public readonly gemType: number;

  public constructor(itemId: number, gemType: number) {
    super(itemId);
    this.gemType = gemType;
  }
}
