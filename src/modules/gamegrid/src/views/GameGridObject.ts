import * as THREE from "three";
import type { AddGridData } from "./IGameGridView.js";
import { GameGridPreset } from "../models/GameGridPreset.js";
import type { Vector3 } from "../types/Vector3.js";
import { GameGridObjectCreator } from "./GameGridObjectCreator.js";
import type { GameGridItemObject } from "./GameGridItemObject.js";
import type { GameGridCellObject } from "./GameGridCellObject.js";


export class GameGridObject extends THREE.Group {
    //  FIELDS
    public readonly gridId: number;
    public readonly columnCount: number;
    public readonly rowCount: number;
    public readonly preset: GameGridPreset;
    private readonly _creator: GameGridObjectCreator;
    private readonly _cells: GameGridCellObject[][];

    //  CONSTRUCTOR
    public constructor(data: AddGridData, creator: GameGridObjectCreator) {
        super();
        this.gridId = data.id;
        this.columnCount = data.columnCount;
        this.rowCount = data.rowCount;
        this.preset = data.preset ?? GameGridPreset.DEFAULT;
        this.position.set(data.position.x, data.position.y, data.position.z);
        this.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
        this._creator = creator;
        this._cells = [] as GameGridCellObject[][];

        for (let col = 0; col < this.columnCount; col++) {
            const colArr: GameGridCellObject[] = [];
            for (let row = 0; row < this.rowCount; row++) {
                const pos = this.preset.getCellPosition(col, row);
                const cell = this._creator.createCellObject(this.id, col, row, pos, this.preset);
                colArr.push(cell);
                this.add(cell);
            }
            this._cells.push(colArr);
        }
    }

    //  METHODS
    public addItem(item: GameGridItemObject, col: number, row: number): void {
        const cell = this._cells[col]?.[row];
        if (cell) {
            cell.setItem(item);
            item.setCell(cell);
        }
        else {
            throw new Error(`Cell not found at column ${col} and row ${row}`);
        }
    }

    public removeItem(item: GameGridItemObject, col: number, row: number): void {
        const cell = this._cells[col]?.[row];
        if (cell) {
            cell.removeItem();
            item.removeFromParent();
        } else {
            throw new Error(`Cell not found at column ${col} and row ${row}`);
        }
    }

    public getCell(col: number, row: number): GameGridCellObject | undefined {
        return this._cells[col]?.[row];
    }

    public removeItemAt(col: number, row: number): void {
        this.getCell(col, row)?.removeItem();
    }
}