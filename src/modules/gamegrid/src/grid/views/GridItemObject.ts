import { BoxGeometry, Mesh, MeshStandardMaterial } from "three";
import type { BaseGridPreset } from "../models/BaseGridPreset.js";
import type { IAssetManager } from "../../../../../core/assets/IAssetManager.js";
import type { GridCellObject } from "./GridCellObject.js";
import type { IGridObjectListener } from "./IGridObjectListener.js";
import type { IInputManager } from "../../../../../core/input/IInputManager.js";
import { WorldInteractiveObject } from "../../../../../core/world/WorldInteractiveObject.js";

export class GridItemObjectOptions {
  public readonly itemId: number;
  public readonly gridPreset: BaseGridPreset;

  public constructor(itemId: number, gridPreset: BaseGridPreset) {
    this.itemId = itemId;
    this.gridPreset = gridPreset;
  }
}

/**
 * Default item visual + interaction host.
 *
 * `preset` is typed as the shape-agnostic `BaseGridPreset`. The default
 * `createVisual` renders a small placeholder box (0.5 × 0.5 × 0.5,
 * sitting on `y = 0`). Apps subclass this and `declare override readonly
 * preset` to narrow to `RectGridPreset` / `HexGridPreset` and render
 * their own item visuals.
 */
export class GridItemObject extends WorldInteractiveObject {
  public readonly itemId: number;
  public readonly preset: BaseGridPreset;
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
    const material = new MeshStandardMaterial({ color: 0x334155 });
    const geom = new BoxGeometry(0.5, 0.5, 0.5);
    const mesh = new Mesh(geom, material);
    mesh.position.set(0, 0.25, 0);
    this.add(mesh);
  }

  protected createCollider(): void {}
}
