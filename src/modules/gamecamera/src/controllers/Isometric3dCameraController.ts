import * as THREE from "three";
import type { GameCameraManager } from "../GameCameraManager.js";
import { GameCameraMode } from "../GameCameraMode.js";
import { IsometricBaseCameraController } from "./IsometricBaseCameraController.js";

const ISOMETRIC_DISTANCE = 15;

export class Isometric3dCameraController extends IsometricBaseCameraController {
  public constructor(manager: GameCameraManager) {
    super(manager, GameCameraMode.Isometric3d);
  }

  public get isOrtho(): boolean {
    return false;
  }

  public applyPositionToCamera(camera: THREE.Camera, focus: THREE.Vector3, _orthoSize: number): void {
    camera.rotation.set(0, 0, 0);
    camera.up.set(0, 1, 0);
    camera.position.set(focus.x + ISOMETRIC_DISTANCE, focus.y + ISOMETRIC_DISTANCE, focus.z + ISOMETRIC_DISTANCE);
    camera.lookAt(focus.x, focus.y, focus.z);
  }

  public getFocusFromOrthoPosition(orthoPos: THREE.Vector3, _orthoSize: number): THREE.Vector3 {
    return new THREE.Vector3(orthoPos.x - ISOMETRIC_DISTANCE, orthoPos.y - ISOMETRIC_DISTANCE, orthoPos.z - ISOMETRIC_DISTANCE);
  }

  public override move(x: number, y: number, z: number): void {
    this._manager.setPosition(x, y, z);
  }
}
