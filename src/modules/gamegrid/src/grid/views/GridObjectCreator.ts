import type { IAssetManager } from "../../../../../core/assets/IAssetManager.js";
import type { GridCellObjectOptions } from "./GridCellObject";
import { GridCellObject } from "./GridCellObject";
import type { GridItemObjectOptions } from "./GridItemObject";
import { GridItemObject } from "./GridItemObject";
import type { IGridObjectListener } from "./IGridObjectListener";
import type { IInputManager } from "../../../../../core/input/IInputManager.js";

export class GridObjectCreator {
  public createCellObject(
    options: GridCellObjectOptions,
    pointerListener: IGridObjectListener,
    inputManager: IInputManager | null,
    assetManager?: IAssetManager | null,
  ): GridCellObject {
    return new GridCellObject(options, pointerListener, inputManager, assetManager);
  }

  public createItemObject(
    options: GridItemObjectOptions,
    pointerListener: IGridObjectListener,
    inputManager: IInputManager | null,
    assetManager?: IAssetManager | null,
  ): GridItemObject {
    if (!pointerListener) throw new Error("Pointer listener is required");
    return new GridItemObject(options, pointerListener, inputManager, assetManager);
  }
}
