import * as THREE from "three";
import type { IGridObjectListener, IInputManager } from "gamelabsjs";
import { GridItemObject } from "gamelabsjs";
import { Team } from "../models/GameItem.js";
import type { GameItemObjectOptions } from "./GameItemObjectOptions.js";

export class GameItemObject extends GridItemObject {
  public constructor(options: GameItemObjectOptions, pointerListener: IGridObjectListener, inputManager: IInputManager | null) {
    super(options, pointerListener, inputManager);
  }

  protected override createVisual(): void {
    const team = (this._options as GameItemObjectOptions).team;
    const color = team === Team.X ? 0x3b82f6 : 0xef4444;
    const material = new THREE.MeshStandardMaterial({ color });
    const size = Math.min(this.preset.columnSize, this.preset.rowSize);
    const h = size * 0.1;

    if (team === Team.X) {
      const armLength = size * 0.45;
      const armThickness = size * 0.08;
      const boxGeom = new THREE.BoxGeometry(armThickness, h, armLength);
      const box1 = new THREE.Mesh(boxGeom, material);
      box1.rotation.y = Math.PI / 4;
      box1.position.y = h * 0.5;
      this.add(box1);
      const box2 = new THREE.Mesh(boxGeom.clone(), material);
      box2.rotation.y = -Math.PI / 4;
      box2.position.y = h * 0.5;
      this.add(box2);
    } else {
      const radius = size * 0.22;
      const tube = size * 0.06;
      const geom = new THREE.TorusGeometry(radius, tube, 16, 24);
      const mesh = new THREE.Mesh(geom, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = tube;
      this.add(mesh);
    }
  }
}
