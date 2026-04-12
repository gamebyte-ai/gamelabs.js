import type * as THREE from "three";
import type { GameCameraManager } from "../utilities/GameCameraManager.js";
import type { GameCameraMode } from "../constants/GameCameraMode.js";
import { TOPDOWN_OFFSET } from "../constants/GameCameraDefaults.js";
import { BaseCameraController } from "./BaseCameraController.js";

export abstract class TopdownBaseCameraController extends BaseCameraController {
  protected constructor(manager: GameCameraManager, mode: GameCameraMode.Topdown2d | GameCameraMode.Topdown3d) {
    super(manager, mode);
  }

  public override applyPositionToCamera(camera: THREE.Camera, focus: THREE.Vector3, _orthoSize: number): void {
    camera.rotation.set(0, 0, 0);
    camera.up.set(0, 1, 0);
    camera.position.set(focus.x, focus.y + TOPDOWN_OFFSET, focus.z);
    camera.lookAt(focus.x, focus.y, focus.z);
  }

  public abstract move(x: number, yOrZ: number, z?: number): void;
}
