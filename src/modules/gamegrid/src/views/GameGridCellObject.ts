import * as THREE from "three";
import type { Vector3 } from "../types/Vector3.js";
import { GameGridPreset } from "../models/GameGridPreset.js";
import { GameGridItemObject } from "./GameGridItemObject.js";


export class GameGridCellObject extends THREE.Group {
    //  CONSTANTS
    private static readonly DEFAULT_THICKNESS = 0.1;


    //  FIELDS
    public readonly gridId: number;
    public readonly col: number;
    public readonly row: number;
    public readonly preset: GameGridPreset;
    private _item: GameGridItemObject | null;
    
    //  CONSTRUCTOR
    public constructor(gridId: number, 
                       col: number, 
                       row: number, 
                       position: Vector3, 
                       preset: GameGridPreset) {
        super();
        this.gridId = gridId;
        this.col = col;
        this.row = row;
        this.preset = preset;
        this.position.set(position.x, position.y, position.z);
        this._item = null;
        this.createVisual();
    }

    //  METHODS
    public setItem(item: GameGridItemObject): void {
        this._item = item;
        this.add(item);
    }

    public removeItem(): void {
        if (this._item) {
            this._item.removeFromParent();
            this._item = null;
        }
    }

    protected createVisual(): void {
        const material = new THREE.MeshStandardMaterial({ color: 0x334155 });
        const geom = new THREE.BoxGeometry(this.preset.columnSize*0.4, GameGridCellObject.DEFAULT_THICKNESS, this.preset.rowSize*0.4);
        const mesh = new THREE.Mesh(geom, material!);
        mesh.position.set(0, -GameGridCellObject.DEFAULT_THICKNESS*0.5, 0);
        this.add(mesh);
    }
}