import * as THREE from "three";
import type { GameCameraManager } from "../GameCameraManager.js";
import { GameCameraMode } from "../GameCameraMode.js";
import { IsometricBaseCameraController } from "./IsometricBaseCameraController.js";

const DEFAULT_Y = 0;

export class Isometric2dCameraController extends IsometricBaseCameraController {
  private _defaultY = DEFAULT_Y;

  public constructor(manager: GameCameraManager) {
    super(manager, GameCameraMode.Isometric2d);
  }

  public get isOrtho(): boolean {
    return true;
  }

  public applyPositionToCamera(camera: THREE.Camera, focus: THREE.Vector3, orthoSize: number): void {
    camera.rotation.set(0, 0, 0);
    camera.up.set(0, 1, 0);
    camera.position.set(focus.x + orthoSize, focus.y + orthoSize, focus.z + orthoSize);
    camera.lookAt(focus.x, focus.y, focus.z);
  }

  public getFocusFromOrthoPosition(_orthoPos: THREE.Vector3, _orthoSize: number): THREE.Vector3 {
    return new THREE.Vector3();
  }

  public setDefaultY(y: number): void {
    this._defaultY = y;
  }

  public override move(x: number, z: number): void {
    this._manager.setPosition(x, this._defaultY, z);
  }
}
