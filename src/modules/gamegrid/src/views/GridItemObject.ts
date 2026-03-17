import * as THREE from "three";
import { GridPreset } from "../models/GridPreset.js";
import type { GridCellObject } from "./GridCellObject.js";
import { IGridObjectListener } from "./IGridObjectListener.js";
import type { IInputManager } from "../../../../core/input/IInputManager.js";
import type { IPointerInputHandler } from "../../../../core/input/IPointerInputHandler.js";
import { WorldInteractiveObject } from "../../../../core/views/WorldInteractiveObject.js";

export class GridItemObject extends WorldInteractiveObject {
  public readonly itemId: number;
  public readonly preset: GridPreset;
  protected readonly _pointerListener: IGridObjectListener;
  protected _cell: GridCellObject | null;

  public constructor(itemId: number, preset: GridPreset, pointerListener: IGridObjectListener, __inputManager: IInputManager | null) {
    super();
    this.itemId = itemId;
    this.preset = preset;
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
