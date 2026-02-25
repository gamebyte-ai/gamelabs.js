import * as THREE from "three";

import type { World } from "../World.js";
import type { GroundGridOptions, IGroundGrid } from "./IGroundGrid.js";

export class GroundGrid implements IGroundGrid {
  private readonly _world: World;
  private _grid: THREE.GridHelper | null = null;
  private _options: Required<GroundGridOptions> = { size: 20, divisions: 20, color1: 0x223047, color2: 0x152033, y: 0 };

  public constructor(world: World) {
    this._world = world;
  }

  public get isVisible(): boolean {
    return this._grid?.visible ?? false;
  }

  public setOptions(options: GroundGridOptions): void {
    if (typeof options.size === "number") this._options.size = options.size;
    if (typeof options.divisions === "number") this._options.divisions = options.divisions;
    if (typeof options.color1 !== "undefined") this._options.color1 = options.color1;
    if (typeof options.color2 !== "undefined") this._options.color2 = options.color2;
    if (typeof options.y === "number") this._options.y = options.y;

    if (this._grid) this._recreateGrid(this._grid.visible);
  }

  public show(visible: boolean): void {
    if (!this._grid) {
      if (!visible) return;
      this._createGrid(true);
      return;
    }
    this._grid.visible = visible;
  }

  public destroy(): void {
    this._destroyGrid();
  }

  private _createGrid(visible: boolean): void {
    this._destroyGrid();
    const grid = new THREE.GridHelper(this._options.size, this._options.divisions, this._options.color1, this._options.color2);
    grid.position.y = this._options.y;
    grid.visible = visible;
    this._world.scene.add(grid);
    this._grid = grid;
  }

  private _recreateGrid(visible: boolean): void {
    this._createGrid(visible);
  }

  private _destroyGrid(): void {
    if (!this._grid) return;
    this._world.scene.remove(this._grid);
    this._grid.geometry.dispose();
    const material = this._grid.material;
    if (Array.isArray(material)) material.forEach((m) => m.dispose());
    else material.dispose();
    this._grid = null;
  }
}

