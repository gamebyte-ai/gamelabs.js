import { DefaultGridAllocator, type IGridAllocator, type Grid, type GridCell, type GridItem } from "gamelabsjs";
import { GameItem, Team } from "../models/GameItem.js";

export class GameGridAllocator extends DefaultGridAllocator implements IGridAllocator {
  public override createItem(options: { id?: number; team?: Team }): GridItem {
    return new GameItem(options?.id ?? 0, options?.team ?? Team.X);
  }
}
