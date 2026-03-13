import * as THREE from "three";
import { GameGridPreset } from "../models/GameGridPreset.js";
import type { GameGridCellObject } from "./GameGridCellObject.js";


export class GameGridItemObject extends THREE.Group {
    //  FIELDS
    public readonly itemId: number;
    public readonly preset: GameGridPreset;
    private _cell: GameGridCellObject | null;

    //  CONSTRUCTOR
    public constructor(itemId: number, preset: GameGridPreset) {
        super();
        this.itemId = itemId;
        this.preset = preset;
        this._cell = null;
        this.createVisual();
    }

    //  METHODS
    public setCell(cell: GameGridCellObject): void {
        this._cell = cell;
    }

    protected createVisual(): void {
        const material = new THREE.MeshStandardMaterial({ color: 0x334155 });
        const geom = new THREE.BoxGeometry(this.preset.columnSize*0.5, 1, this.preset.rowSize*0.5);
        const mesh = new THREE.Mesh(geom, material!);
        mesh.position.set(0, 0.5, 0);
        this.add(mesh);   
    }
}