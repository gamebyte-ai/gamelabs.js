import * as THREE from "three";
import type { GameCameraManager } from "../GameCameraManager.js";
import { GameCameraMode } from "../GameCameraMode.js";
import { FrontBaseCameraController } from "./FrontBaseCameraController.js";

const DEFAULT_Z = 0;

export class Front2dCameraController extends FrontBaseCameraController {
  private _defaultZ = DEFAULT_Z;

  public constructor(manager: GameCameraManager) {
    super(manager, GameCameraMode.Front2d);
  }

  public get isOrtho(): boolean {
    return true;
  }

  public override applyPositionToCamera(camera: THREE.Camera, focus: THREE.Vector3, orthoSize: number): void {
    super.applyPositionToCamera(camera, focus, orthoSize);
  }

  public override getFocusFromOrthoPosition(_orthoPos: THREE.Vector3, _orthoSize: number): THREE.Vector3 {
    return new THREE.Vector3();
  }

  public setDefaultZ(z: number): void {
    this._defaultZ = z;
  }

  public override move(x: number, y: number): void {
    this._manager.setPosition(x, y, this._defaultZ);
  }
}
