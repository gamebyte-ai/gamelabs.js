import * as THREE from "three";
import type { Vector3 } from "../types/Vector3.js";
import type { IAssetManager } from "../../../../core/assets/IAssetManager.js";
import { GameGridPreset } from "../models/GameGridPreset.js";
import { GameGridItemObject } from "./GameGridItemObject.js";
import { WorldInteractiveObject } from "../../../../core/views/WorldInteractiveObject.js";
import { IGameGridObjectPointerListener } from "./IGameGridObjectPointerListener.js";
import type { IInputManager } from "../../../../core/input/IInputManager.js";
import type { IPointerInputHandler } from "../../../../core/input/IPointerInputHandler.js";

export class GameGridCellObject extends WorldInteractiveObject {
    //  CONSTANTS
    private static readonly DEFAULT_THICKNESS = 0.1;


    //  FIELDS
    public readonly gridId: number;
    public readonly col: number;
    public readonly row: number;
    public readonly preset: GameGridPreset;
    protected readonly _pointerListener: IGameGridObjectPointerListener;
    protected _item: GameGridItemObject | null;
    protected readonly _assetManager: IAssetManager | null;
    
    //  CONSTRUCTOR
    public constructor(gridId: number, col: number, row: number, position: Vector3, preset: GameGridPreset, pointerListener: IGameGridObjectPointerListener, __inputManager: IInputManager | null, assetManager?: IAssetManager | null) {
        super();
        this.gridId = gridId;
        this.col = col;
        this.row = row;
        this.preset = preset;
        this.position.set(position.x, position.y, position.z);
        this._pointerListener = pointerListener;
        this._assetManager = assetManager ?? null;
        this.setInputManager(__inputManager);
        this._item = null;
        this.createVisual();
        this.createCollider();
    }

    //  METHODS
    public get item(): GameGridItemObject | null {
        return this._item;
    }

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

    protected createCollider(): void {
    }
}