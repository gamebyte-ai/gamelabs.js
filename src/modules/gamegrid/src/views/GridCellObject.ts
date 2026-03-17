import * as THREE from "three";
import type { Vector3 } from "../types/Vector3.js";
import type { IAssetManager } from "../../../../core/assets/IAssetManager.js";
import { GridPreset } from "../models/GridPreset.js";
import { GridItemObject } from "./GridItemObject.js";
import { WorldInteractiveObject } from "../../../../core/views/WorldInteractiveObject.js";
import { IGridObjectListener } from "./IGridObjectListener.js";
import type { IInputManager } from "../../../../core/input/IInputManager.js";
import type { IPointerInputHandler } from "../../../../core/input/IPointerInputHandler.js";

export class GridCellObject extends WorldInteractiveObject {
  private static readonly DEFAULT_THICKNESS = 0.1;

  public readonly gridId: number;
  public readonly col: number;
  public readonly row: number;
  public readonly preset: GridPreset;
  protected readonly _pointerListener: IGridObjectListener;
  protected _item: GridItemObject | null;
  protected readonly _assetManager: IAssetManager | null;

  public constructor(gridId: number, col: number, row: number, position: Vector3, preset: GridPreset, pointerListener: IGridObjectListener, __inputManager: IInputManager | null, assetManager?: IAssetManager | null) {
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

  public get item(): GridItemObject | null {
    return this._item;
  }

  public setItem(item: GridItemObject): void {
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
    const geom = new THREE.BoxGeometry(this.preset.columnSize * 0.4, GridCellObject.DEFAULT_THICKNESS, this.preset.rowSize * 0.4);
    const mesh = new THREE.Mesh(geom, material!);
    mesh.position.set(0, -GridCellObject.DEFAULT_THICKNESS * 0.5, 0);
    this.add(mesh);
  }

  protected createCollider(): void {}
}
