import { Vector3 } from "three";
import type { GameCameraManager } from "../utilities/GameCameraManager.js";
import { GameCameraMode } from "../constants/GameCameraMode.js";
import { DEFAULT_Y } from "../constants/GameCameraDefaults.js";
import { TopdownBaseCameraController } from "./TopdownBaseCameraController.js";

export class Topdown2dCameraController extends TopdownBaseCameraController {
  private _defaultY = DEFAULT_Y;

  public constructor(manager: GameCameraManager) {
    super(manager, GameCameraMode.Topdown2d);
  }

  public get isOrtho(): boolean {
    return true;
  }

  public override getFocusFromOrthoPosition(_orthoPos: Vector3, _orthoSize: number): Vector3 {
    return new Vector3();
  }

  public setDefaultY(y: number): void {
    this._defaultY = y;
  }

  public override move(x: number, z: number): void {
    this._manager.setPosition(x, this._defaultY, z);
  }
}
