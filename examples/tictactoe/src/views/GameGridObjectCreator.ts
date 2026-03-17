import type { IAssetManager } from "gamelabsjs";
import { GridCellObjectOptions, GridObjectCreator, GridItemObjectOptions } from "gamelabsjs";
import type { IGridObjectListener } from "gamelabsjs";
import type { IInputManager } from "gamelabsjs";
import { GameCellObject } from "./GameCellObject.js";
import { GameItemObject } from "./GameItemObject.js";
import type { GameItemObjectOptions } from "./GameItemObjectOptions.js";

export class GameGridObjectCreator extends GridObjectCreator {
  public override createCellObject(options: GridCellObjectOptions, pointerListener: IGridObjectListener, inputManager: IInputManager | null, assetManager?: IAssetManager | null): GameCellObject {
    return new GameCellObject(options, pointerListener, inputManager, assetManager);
  }

  public override createItemObject(options: GridItemObjectOptions, pointerListener: IGridObjectListener, inputManager: IInputManager | null, assetManager?: IAssetManager | null): GameItemObject {
    return new GameItemObject(options as GameItemObjectOptions, pointerListener, inputManager, assetManager);
  }
}
