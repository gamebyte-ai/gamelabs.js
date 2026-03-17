import { GameGridObjectCreator, GameGridPreset } from "gamelabsjs";
import type { IGameGridObjectPointerListener } from "gamelabsjs";
import type { IInputManager } from "gamelabsjs";
import type { Vector3 } from "gamelabsjs";
import { Example03GridCellObject } from "./Example03GridCellObject.js";
import { Example03GridItemObject } from "./Example03GridItemObject.js";

export class Example03GridObjectCreator extends GameGridObjectCreator {
  public override createCellObject(gridId: number, col: number, row: number, position: Vector3, preset: GameGridPreset, pointerListener: IGameGridObjectPointerListener, inputManager: IInputManager | null): Example03GridCellObject {
    return new Example03GridCellObject(gridId, col, row, position, preset, pointerListener, inputManager);
  }

  public override createItemObject(itemId: number, preset: GameGridPreset, pointerListener: IGameGridObjectPointerListener, inputManager: IInputManager | null): Example03GridItemObject {
    return new Example03GridItemObject(itemId, preset, pointerListener, inputManager);
  }
}
