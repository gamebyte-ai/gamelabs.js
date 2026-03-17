import type { IAssetManager } from "gamelabsjs";
import { GridObjectCreator, GridPreset } from "gamelabsjs";
import type { IGridObjectListener } from "gamelabsjs";
import type { IInputManager } from "gamelabsjs";
import type { Vector3 } from "gamelabsjs";
import { GameCellObject } from "./GameCellObject.js";
import { GameItemObject } from "./GameItemObject.js";

export class GameGridObjectCreator extends GridObjectCreator {
  public override createCellObject(gridId: number, col: number, row: number, position: Vector3, preset: GridPreset, pointerListener: IGridObjectListener, inputManager: IInputManager | null, assetManager?: IAssetManager | null): GameCellObject {
    return new GameCellObject(gridId, col, row, position, preset, pointerListener, inputManager, assetManager);
  }

  public override createItemObject(itemId: number, preset: GridPreset, pointerListener: IGridObjectListener, inputManager: IInputManager | null): GameItemObject {
    return new GameItemObject(itemId, preset, pointerListener, inputManager);
  }
}
