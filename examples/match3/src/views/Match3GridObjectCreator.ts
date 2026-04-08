import type { IAssetManager, IInputManager } from "@gamebyte/gamelabsjs";
import { GridCellObjectOptions, GridObjectCreator, GridItemObjectOptions, type IGridObjectListener } from "@gamebyte/gamelabsjs";
import { Match3CellObject } from "./Match3CellObject.js";
import { Match3GemItemObject } from "./Match3GemItemObject.js";
import type { Match3GemItemObjectOptions } from "./Match3GemItemObjectOptions.js";

export class Match3GridObjectCreator extends GridObjectCreator {
  public override createCellObject(options: GridCellObjectOptions, pointerListener: IGridObjectListener, inputManager: IInputManager | null, assetManager?: IAssetManager | null): Match3CellObject {
    return new Match3CellObject(options, pointerListener, inputManager, assetManager);
  }

  public override createItemObject(options: GridItemObjectOptions, pointerListener: IGridObjectListener, inputManager: IInputManager | null, assetManager?: IAssetManager | null): Match3GemItemObject {
    return new Match3GemItemObject(options as Match3GemItemObjectOptions, pointerListener, inputManager, assetManager);
  }
}
