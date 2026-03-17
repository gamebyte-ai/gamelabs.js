import type { IAssetManager } from "gamelabsjs";
import { GameGridObjectCreator, GameGridPreset } from "gamelabsjs";
import type { IGameGridObjectPointerListener } from "gamelabsjs";
import type { IInputManager } from "gamelabsjs";
import type { Vector3 } from "gamelabsjs";
import { TicTacToeGridCellObject } from "./TicTacToeGridCellObject.js";
import { TicTacToeGridItemObject } from "./TicTacToeGridItemObject.js";

export class TicTacToeGridObjectCreator extends GameGridObjectCreator {
  public override createCellObject(gridId: number, col: number, row: number, position: Vector3, preset: GameGridPreset, pointerListener: IGameGridObjectPointerListener, inputManager: IInputManager | null, assetManager?: IAssetManager | null): TicTacToeGridCellObject {
    return new TicTacToeGridCellObject(gridId, col, row, position, preset, pointerListener, inputManager, assetManager);
  }

  public override createItemObject(itemId: number, preset: GameGridPreset, pointerListener: IGameGridObjectPointerListener, inputManager: IInputManager | null): TicTacToeGridItemObject {
    return new TicTacToeGridItemObject(itemId, preset, pointerListener, inputManager);
  }
}
