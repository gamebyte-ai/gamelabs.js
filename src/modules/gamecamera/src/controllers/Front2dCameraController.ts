import type { Camera } from "three";
import { Vector3 } from "three";
import type { GameCameraManager } from "../utilities/GameCameraManager.js";
import { GameCameraMode } from "../constants/GameCameraMode.js";
import { DEFAULT_Z } from "../constants/GameCameraDefaults.js";
import { FrontBaseCameraController } from "./FrontBaseCameraController.js";

export class Front2dCameraController extends FrontBaseCameraController {
  private _defaultZ = DEFAULT_Z;

  public constructor(manager: GameCameraManager) {
    super(manager, GameCameraMode.Front2d);
  }

  public get isOrtho(): boolean {
    return true;
  }

  public override applyPositionToCamera(camera: Camera, focus: Vector3, orthoSize: number): void {
    super.applyPositionToCamera(camera, focus, orthoSize);
  }

  public override getFocusFromOrthoPosition(_orthoPos: Vector3, _orthoSize: number): Vector3 {
    return new Vector3();
  }

  public setDefaultZ(z: number): void {
    this._defaultZ = z;
  }

  public override move(x: number, y: number): void {
    this._manager.setPosition(x, y, this._defaultZ);
  }
}
