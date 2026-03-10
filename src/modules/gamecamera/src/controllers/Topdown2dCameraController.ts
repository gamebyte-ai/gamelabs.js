import * as THREE from "three";
import type { GameCameraManager } from "../GameCameraManager.js";
import { GameCameraMode } from "../GameCameraMode.js";
import { TopdownBaseCameraController } from "./TopdownBaseCameraController.js";

const DEFAULT_Y = 0;

export class Topdown2dCameraController extends TopdownBaseCameraController {
  private _defaultY = DEFAULT_Y;

  public constructor(manager: GameCameraManager) {
    super(manager, GameCameraMode.Topdown2d);
  }

  public get isOrtho(): boolean {
    return true;
  }

  public override getFocusFromOrthoPosition(_orthoPos: THREE.Vector3, _orthoSize: number): THREE.Vector3 {
    return new THREE.Vector3();
  }

  public setDefaultY(y: number): void {
    this._defaultY = y;
  }

  public override move(x: number, z: number): void {
    this._manager.setPosition(x, this._defaultY, z);
  }
}
