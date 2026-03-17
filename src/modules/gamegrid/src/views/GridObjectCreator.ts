import type { IAssetManager } from "../../../../core/assets/IAssetManager.js";
import { GridCellObject } from "./GridCellObject";
import { GridItemObject } from "./GridItemObject";
import type { Vector3 } from "../types/Vector3.js";
import { GridPreset } from "../models/GridPreset.js";
import { IGridObjectListener } from "./IGridObjectListener";
import type { IInputManager } from "../../../../core/input/IInputManager.js";

export class GridObjectCreator {
  public createCellObject(gridId: number, col: number, row: number, position: Vector3, preset: GridPreset, pointerListener: IGridObjectListener, inputManager: IInputManager | null, assetManager?: IAssetManager | null): GridCellObject {
    return new GridCellObject(gridId, col, row, position, preset, pointerListener, inputManager, assetManager);
  }

  public createItemObject(itemId: number, preset: GridPreset, pointerListener: IGridObjectListener, inputManager: IInputManager | null): GridItemObject {
    if (!pointerListener) throw new Error("Pointer listener is required");
    return new GridItemObject(itemId, preset, pointerListener, inputManager);
  }
}
