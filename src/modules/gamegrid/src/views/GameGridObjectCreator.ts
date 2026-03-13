import { GameGridCellObject } from "./GameGridCellObject";
import { GameGridItemObject } from "./GameGridItemObject";
import type { Vector3 } from "../types/Vector3.js";
import { GameGridPreset } from "../models/GameGridPreset.js";


export class GameGridObjectCreator {
    //  METHODS
    public createCellObject(gridId: number, 
        col: number, 
        row: number, 
        position: Vector3, 
        preset: GameGridPreset): GameGridCellObject {
        return new GameGridCellObject(gridId, col, row, position, preset);
    }

    public createItemObject(itemId: number, preset: GameGridPreset): GameGridItemObject {
        return new GameGridItemObject(itemId, preset);
    }
}