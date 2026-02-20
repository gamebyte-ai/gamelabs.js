import * as THREE from "three";

import type { Hud } from "./Hud.js";
import type { World } from "./World.js";

export type GroundGridOptions = {
  size?: number;
  divisions?: number;
  color1?: THREE.ColorRepresentation;
  color2?: THREE.ColorRepresentation;
  y?: number;
};

export class DevUtils {
  public readonly world: World;
  private readonly _hud: Hud;

  private _groundGrid: THREE.GridHelper | null = null;
  private _statsVisible = false;

  public constructor(world: World, hud: Hud) {
    this.world = world;
    this._hud = hud;
  }

  public get isGroundGridVisible(): boolean {
    return this._groundGrid?.visible ?? false;
  }

  public get isStatsVisible(): boolean {
    return this._statsVisible;
  }

  public createGroundGrid(options: GroundGridOptions = {}): THREE.GridHelper {
    const size = options.size ?? 20;
    const divisions = options.divisions ?? 20;
    const color1 = options.color1 ?? 0x223047;
    const color2 = options.color2 ?? 0x152033;
    const y = options.y ?? 0;

    if (this._groundGrid) {
      this.world.scene.remove(this._groundGrid);
      this._groundGrid.geometry.dispose();
      const material = this._groundGrid.material;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material.dispose();
      this._groundGrid = null;
    }

    const grid = new THREE.GridHelper(size, divisions, color1, color2);
    grid.position.y = y;
    grid.visible = true;

    this.world.scene.add(grid);
    this._groundGrid = grid;
    return grid;
  }

  public showGroundGrid(visible: boolean): void {
    if (!this._groundGrid) {
      if (!visible) return;
      this.createGroundGrid();
    }
    if (this._groundGrid) this._groundGrid.visible = visible;
  }

  public showStats(show: boolean): void {
    this._statsVisible = show;
    this._hud?.showStats(show);
  }

  public destroy(): void {
    if (!this._groundGrid) return;
    this.world.scene.remove(this._groundGrid);
    this._groundGrid.geometry.dispose();
    const material = this._groundGrid.material;
    if (Array.isArray(material)) material.forEach((m) => m.dispose());
    else material.dispose();
    this._groundGrid = null;
  }
}

