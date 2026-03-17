import { GridItemObjectOptions, type GridPreset } from "gamelabsjs";
import { Team } from "../models/GameItem.js";

export class GameItemObjectOptions extends GridItemObjectOptions {
  public readonly team: Team;

  public constructor(itemId: number, gridPreset: GridPreset, team: Team) {
    super(itemId, gridPreset);
    this.team = team;
  }
}
