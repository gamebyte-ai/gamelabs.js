import * as THREE from "three";
import type { IAssetManager } from "../../../../core/assets/IAssetManager.js";
import type { GridPreset } from "../models/GridPreset.js";
import type { GridCellObject } from "./GridCellObject.js";
import type { IGridObjectListener } from "./IGridObjectListener.js";
import type { IInputManager } from "../../../../core/input/IInputManager.js";
import { WorldInteractiveObject } from "../../../../core/world/WorldInteractiveObject.js";

export class GridItemObjectOptions {
  public readonly itemId: number;
  public readonly gridPreset: GridPreset;

  public constructor(itemId: number, gridPreset: GridPreset) {
    this.itemId = itemId;
    this.gridPreset = gridPreset;
  }
}

export class GridItemObject extends WorldInteractiveObject {
  public readonly itemId: number;
  public readonly preset: GridPreset;
  protected readonly _options: GridItemObjectOptions;
  protected readonly _pointerListener: IGridObjectListener;
  protected readonly _assetManager: IAssetManager | null;
  protected _cell: GridCellObject | null;

  public constructor(
    options: GridItemObjectOptions,
    pointerListener: IGridObjectListener,
    __inputManager: IInputManager | null,
    assetManager?: IAssetManager | null,
  ) {
    super();
    this._assetManager = assetManager ?? null;
    this._options = options;
    this.itemId = options.itemId;
    this.preset = options.gridPreset;
    this._pointerListener = pointerListener;
    this.setInputManager(__inputManager);
    this._cell = null;
    this.createVisual();
    this.createCollider();
  }

  public setCell(cell: GridCellObject): void {
    this._cell = cell;
  }

  protected createVisual(): void {
    const material = new THREE.MeshStandardMaterial({ color: 0x334155 });
    const geom = new THREE.BoxGeometry(this.preset.columnSize * 0.5, 1, this.preset.rowSize * 0.5);
    const mesh = new THREE.Mesh(geom, material!);
    mesh.position.set(0, 0.5, 0);
    this.add(mesh);
  }

  protected createCollider(): void {}
}
