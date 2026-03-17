import type { IAssetManager } from "../../../../core/assets/IAssetManager.js";
import { GameGridCellObject } from "./GameGridCellObject";
import { GameGridItemObject } from "./GameGridItemObject";
import type { Vector3 } from "../types/Vector3.js";
import { GameGridPreset } from "../models/GameGridPreset.js";
import { IGameGridObjectPointerListener } from "./IGameGridObjectPointerListener";
import type { IInputManager } from "../../../../core/input/IInputManager.js";


export class GameGridObjectCreator {
    //  METHODS
    public createCellObject(gridId: number, col: number, row: number, position: Vector3, preset: GameGridPreset, pointerListener: IGameGridObjectPointerListener, inputManager: IInputManager | null, assetManager?: IAssetManager | null): GameGridCellObject {
        return new GameGridCellObject(gridId, col, row, position, preset, pointerListener, inputManager, assetManager);
    }

    public createItemObject(itemId: number,
                            preset: GameGridPreset,
                            pointerListener: IGameGridObjectPointerListener,
                            inputManager: IInputManager | null): GameGridItemObject {
        if (!pointerListener) throw new Error("Pointer listener is required");
        return new GameGridItemObject(itemId, preset, pointerListener, inputManager);
    }
}