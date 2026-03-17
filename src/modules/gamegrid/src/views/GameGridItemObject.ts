import * as THREE from "three";
import { GameGridPreset } from "../models/GameGridPreset.js";
import type { GameGridCellObject } from "./GameGridCellObject.js";
import { IGameGridObjectPointerListener } from "./IGameGridObjectPointerListener.js";
import type { IInputManager } from "../../../../core/input/IInputManager.js";
import type { IPointerInputHandler } from "../../../../core/input/IPointerInputHandler.js";
import { WorldInteractiveObject } from "../../../../core/views/WorldInteractiveObject.js";

export class GameGridItemObject extends WorldInteractiveObject {
    //  FIELDS
    public readonly itemId: number;
    public readonly preset: GameGridPreset;
    protected readonly _pointerListener: IGameGridObjectPointerListener;
    protected _cell: GameGridCellObject | null;

    //  CONSTRUCTOR
    public constructor(itemId: number, preset: GameGridPreset, pointerListener: IGameGridObjectPointerListener, __inputManager: IInputManager | null) {
        super();
        this.itemId = itemId;
        this.preset = preset;
        this._pointerListener = pointerListener;
        this.setInputManager(__inputManager);
        this._cell = null;
        this.createVisual();
        this.createCollider();
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

    protected createCollider(): void {
    }
}