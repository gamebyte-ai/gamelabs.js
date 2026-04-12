import * as THREE from "three";
import type { GameCameraManager } from "../utilities/GameCameraManager.js";
import { GameCameraMode } from "../constants/GameCameraMode.js";
import { FRONT_OFFSET } from "../constants/GameCameraDefaults.js";
import { FrontBaseCameraController } from "./FrontBaseCameraController.js";

export class Front3dCameraController extends FrontBaseCameraController {
  public constructor(manager: GameCameraManager) {
    super(manager, GameCameraMode.Front3d);
  }

  public get isOrtho(): boolean {
    return false;
  }

  public override applyPositionToCamera(camera: THREE.Camera, focus: THREE.Vector3, orthoSize: number): void {
    super.applyPositionToCamera(camera, focus, orthoSize);
  }

  public override getFocusFromOrthoPosition(orthoPos: THREE.Vector3, _orthoSize: number): THREE.Vector3 {
    return new THREE.Vector3(orthoPos.x, orthoPos.y, orthoPos.z - FRONT_OFFSET);
  }

  public override move(x: number, y: number, z: number): void {
    this._manager.setPosition(x, y, z);
  }
}
