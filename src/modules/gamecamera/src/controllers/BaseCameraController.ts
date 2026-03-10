import * as THREE from "three";
import type { GameCameraManager } from "../GameCameraManager.js";
import { GameCameraMode } from "../GameCameraMode.js";
import type { ICameraController } from "./ICameraController.js";

export abstract class BaseCameraController implements ICameraController {
  protected readonly _manager: GameCameraManager;
  protected readonly _mode: GameCameraMode;

  protected constructor(manager: GameCameraManager, mode: GameCameraMode) {
    this._manager = manager;
    this._mode = mode;
    manager.setController(this);
  }

  public getMode(): GameCameraMode {
    return this._mode;
  }

  public abstract get isOrtho(): boolean;
  public abstract applyPositionToCamera(camera: THREE.Camera, focus: THREE.Vector3, orthoSize: number): void;
  public abstract getFocusFromOrthoPosition(orthoPos: THREE.Vector3, orthoSize: number): THREE.Vector3;

  public followObject(object: THREE.Object3D, easing?: number): void {
    this._manager.followObject(object, easing);
  }

  public followPosition(x: number, y: number, z: number, easing?: number): void {
    this._manager.followPosition(x, y, z, easing);
  }

  public stopFollow(): void {
    this._manager.stopFollow();
  }

  public activate(): void {
    this._manager.activate();
  }

  public deactivate(): void {
    this._manager.deactivate();
  }
}
