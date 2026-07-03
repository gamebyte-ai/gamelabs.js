import type { Camera } from "three";
import { Vector3 } from "three";
import type { GameCameraManager } from "../utilities/GameCameraManager.js";
import { GameCameraMode } from "../constants/GameCameraMode.js";
import { DEFAULT_Y } from "../constants/GameCameraDefaults.js";
import { IsometricBaseCameraController } from "./IsometricBaseCameraController.js";

export class Isometric2dCameraController extends IsometricBaseCameraController {
  private _defaultY = DEFAULT_Y;

  public constructor(manager: GameCameraManager) {
    super(manager, GameCameraMode.Isometric2d);
  }

  public get isOrtho(): boolean {
    return true;
  }

  public applyPositionToCamera(camera: Camera, focus: Vector3, orthoSize: number): void {
    camera.rotation.set(0, 0, 0);
    camera.up.set(0, 1, 0);
    camera.position.set(focus.x + orthoSize, focus.y + orthoSize, focus.z + orthoSize);
    camera.lookAt(focus.x, focus.y, focus.z);
  }

  public getFocusFromOrthoPosition(_orthoPos: Vector3, _orthoSize: number): Vector3 {
    return new Vector3();
  }

  public setDefaultY(y: number): void {
    this._defaultY = y;
  }

  public override move(x: number, z: number): void {
    this._manager.setPosition(x, this._defaultY, z);
  }
}
