import { CylinderGeometry, Mesh, MeshStandardMaterial } from "three";
import type { BaseGridPreset } from "../models/BaseGridPreset.js";
import type { Vector3 } from "../models/Vector3.js";
import type { IAssetManager } from "../../../../../core/assets/IAssetManager.js";
import type { GridItemObject } from "./GridItemObject.js";
import { WorldInteractiveObject } from "../../../../../core/world/WorldInteractiveObject.three.js";
import type { IGridObjectListener } from "./IGridObjectListener.js";
import type { IWorldPointerInput } from "../../../../../core/world/IWorldPointerInput.js";

export class GridCellObjectOptions {
  public readonly gridId: number;
  public readonly col: number;
  public readonly row: number;
  public readonly position: Vector3;
  public readonly preset: BaseGridPreset;

  public constructor(gridId: number, col: number, row: number, position: Vector3, preset: BaseGridPreset) {
    this.gridId = gridId;
    this.col = col;
    this.row = row;
    this.position = position;
    this.preset = preset;
  }
}

/**
 * Default cell visual + interaction host.
 *
 * `preset` is typed as the shape-agnostic `BaseGridPreset`. The default
 * `createVisual` renders a placeholder cylinder (1 unit diameter, 0.1
 * unit tall, top flush with `y = 0`) — readable for either rect or hex
 * grids. Apps subclass this and `declare override readonly preset` to
 * narrow to `RectGridPreset` / `HexGridPreset` and render their own
 * cell visuals.
 */
export class GridCellObject extends WorldInteractiveObject {
  public readonly gridId: number;
  public readonly col: number;
  public readonly row: number;
  public readonly preset: BaseGridPreset;
  protected readonly _pointerListener: IGridObjectListener;
  protected _item: GridItemObject | null;
  protected readonly _assetManager: IAssetManager | null;

  public constructor(
    options: GridCellObjectOptions,
    pointerListener: IGridObjectListener,
    __inputManager: IWorldPointerInput | null,
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
    this.setWorldPointerInput(__inputManager);
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
    const material = new MeshStandardMaterial({ color: 0x334155 });
    const geom = new CylinderGeometry(0.5, 0.5, 0.1, 24);
    const mesh = new Mesh(geom, material);
    mesh.position.set(0, -0.05, 0);
    this.add(mesh);
  }

  protected createCollider(): void {}
}
