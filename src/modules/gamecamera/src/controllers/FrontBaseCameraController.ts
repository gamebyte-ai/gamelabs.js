import type * as THREE from "three";
import type { GameCameraManager } from "../utilities/GameCameraManager.js";
import type { GameCameraMode } from "../constants/GameCameraMode.js";
import { FRONT_OFFSET } from "../constants/GameCameraDefaults.js";
import { BaseCameraController } from "./BaseCameraController.js";

export abstract class FrontBaseCameraController extends BaseCameraController {
  protected constructor(manager: GameCameraManager, mode: GameCameraMode.Front2d | GameCameraMode.Front3d) {
    super(manager, mode);
  }

  public override applyPositionToCamera(camera: THREE.Camera, focus: THREE.Vector3, _orthoSize: number): void {
    camera.rotation.set(0, 0, 0);
    camera.up.set(0, 1, 0);
    camera.position.set(focus.x, focus.y, focus.z + FRONT_OFFSET);
    camera.lookAt(focus.x, focus.y, focus.z);
  }

  public abstract move(x: number, y: number, z?: number): void;
}
