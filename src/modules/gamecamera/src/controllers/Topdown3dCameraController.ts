import * as THREE from "three";
import type { GameCameraManager } from "../GameCameraManager.js";
import { GameCameraMode } from "../GameCameraMode.js";
import { TopdownBaseCameraController } from "./TopdownBaseCameraController.js";

const TOPDOWN_OFFSET = 10;

export class Topdown3dCameraController extends TopdownBaseCameraController {
  public constructor(manager: GameCameraManager) {
    super(manager, GameCameraMode.Topdown3d);
  }

  public get isOrtho(): boolean {
    return false;
  }

  public override getFocusFromOrthoPosition(orthoPos: THREE.Vector3, _orthoSize: number): THREE.Vector3 {
    return new THREE.Vector3(orthoPos.x, orthoPos.y - TOPDOWN_OFFSET, orthoPos.z);
  }

  public override move(x: number, y: number, z: number): void {
    this._manager.setPosition(x, y, z);
  }
}
