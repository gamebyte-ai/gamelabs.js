import * as THREE from "three";
import type { GameCameraManager } from "../GameCameraManager.js";
import { GameCameraMode } from "../GameCameraMode.js";
import { FrontBaseCameraController } from "./FrontBaseCameraController.js";

const FRONT_OFFSET = 5;

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
