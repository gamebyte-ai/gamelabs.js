import { GridItem } from "@gamebyte/gamelabsjs";

export enum Team {
  X = "X",
  O = "O"
}

export class GameItem extends GridItem {
  public readonly team: Team;

  public constructor(itemId: number, team: Team) {
    super(itemId);
    this.team = team;
  }
}
