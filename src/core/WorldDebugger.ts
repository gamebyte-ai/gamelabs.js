import * as THREE from "three";

import type { World } from "./World.js";

export type GroundGridOptions = {
  size?: number;
  divisions?: number;
  color1?: THREE.ColorRepresentation;
  color2?: THREE.ColorRepresentation;
  y?: number;
};

export class WorldDebugger {
  readonly world: World;

  private groundGrid: THREE.GridHelper | null = null;

  constructor(world: World) {
    this.world = world;
  }

  get isGroundGridVisible(): boolean {
    return this.groundGrid?.visible ?? false;
  }

  createGroundGrid(options: GroundGridOptions = {}): THREE.GridHelper {
    const size = options.size ?? 20;
    const divisions = options.divisions ?? 20;
    const color1 = options.color1 ?? 0x223047;
    const color2 = options.color2 ?? 0x152033;
    const y = options.y ?? 0;

    if (this.groundGrid) {
      this.world.scene.remove(this.groundGrid);
      this.groundGrid.geometry.dispose();
      const material = this.groundGrid.material;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material.dispose();
      this.groundGrid = null;
    }

    const grid = new THREE.GridHelper(size, divisions, color1, color2);
    grid.position.y = y;
    grid.visible = true;

    this.world.scene.add(grid);
    this.groundGrid = grid;
    return grid;
  }

  showGroundGrid(visible: boolean): void {
    if (!this.groundGrid) {
      if (!visible) return;
      this.createGroundGrid();
    }
    if (this.groundGrid) this.groundGrid.visible = visible;
  }

  destroy(): void {
    if (!this.groundGrid) return;
    this.world.scene.remove(this.groundGrid);
    this.groundGrid.geometry.dispose();
    const material = this.groundGrid.material;
    if (Array.isArray(material)) material.forEach((m) => m.dispose());
    else material.dispose();
    this.groundGrid = null;
  }
}

