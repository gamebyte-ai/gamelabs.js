import * as THREE from "three";
import type { Vector3 } from "../types/Vector3.js";
import type { IAssetManager } from "../../../../core/assets/IAssetManager.js";
import type { GridPreset } from "../models/GridPreset.js";
import type { GridItemObject } from "./GridItemObject.js";
import { WorldInteractiveObject } from "../../../../core/world/WorldInteractiveObject.js";
import type { IGridObjectListener } from "./IGridObjectListener.js";
import type { IInputManager } from "../../../../core/input/IInputManager.js";

export class GridCellObjectOptions {
  public readonly gridId: number;
  public readonly col: number;
  public readonly row: number;
  public readonly position: Vector3;
  public readonly preset: GridPreset;

  public constructor(gridId: number, col: number, row: number, position: Vector3, preset: GridPreset) {
    this.gridId = gridId;
    this.col = col;
    this.row = row;
    this.position = position;
    this.preset = preset;
  }
}

export class GridCellObject extends WorldInteractiveObject {
  private static readonly DEFAULT_THICKNESS = 0.1;

  public readonly gridId: number;
  public readonly col: number;
  public readonly row: number;
  public readonly preset: GridPreset;
  protected readonly _pointerListener: IGridObjectListener;
  protected _item: GridItemObject | null;
  protected readonly _assetManager: IAssetManager | null;

  public constructor(
    options: GridCellObjectOptions,
    pointerListener: IGridObjectListener,
    __inputManager: IInputManager | null,
    assetManager?: IAssetManager | null,
  ) {
    super();
    this.gridId = options.gridId;
    this.col = options.col;
    this.row = options.row;
    this.preset = options.preset;
    this.position.set(options.position.x, options.position.y, options.position.z);
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

  public takeItem(): GridItemObject | null {
    const item = this._item;
    if (item) {
      item.removeFromParent();
      this._item = null;
      return item;
    }
    return null;
  }

  protected createVisual(): void {
    const material = new THREE.MeshStandardMaterial({ color: 0x334155 });
    const geom = new THREE.BoxGeometry(
      this.preset.columnSize * 0.4,
      GridCellObject.DEFAULT_THICKNESS,
      this.preset.rowSize * 0.4,
    );
    const mesh = new THREE.Mesh(geom, material!);
    mesh.position.set(0, -GridCellObject.DEFAULT_THICKNESS * 0.5, 0);
    this.add(mesh);
  }

  protected createCollider(): void {}
}
