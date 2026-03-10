import * as THREE from "three";
import type { World } from "../../../core/World.js";
import type { ICameraController } from "./controllers/ICameraController.js";

const DEFAULT_ORTHO_SIZE = 10;
const DEFAULT_EASING = 8;
const PERSPECTIVE_TO_ORTHO_OFFSET = 5;

export class GameCameraManager {
  private _world: World | null = null;
  private _camera: THREE.Camera | null = null;
  private _orthoCamera: THREE.OrthographicCamera | null = null;
  private _perspectiveCamera: THREE.PerspectiveCamera | null = null;
  private _activeController: ICameraController | null = null;
  private _active = true;
  private _orthoSize = DEFAULT_ORTHO_SIZE;
  private _viewportWidth = 1;
  private _viewportHeight = 1;
  private _followObject: THREE.Object3D | null = null;
  private _followPosition: THREE.Vector3 | null = null;
  private _followEasing = DEFAULT_EASING;
  private _currentPosition = new THREE.Vector3();
  private _tempVector = new THREE.Vector3();
  private _tempDirection = new THREE.Vector3();

  public setController(controller: ICameraController): void {
    this._activeController = controller;
    this._ensureCameraForController(this._camera);
    this._applyPositionToCamera();
  }

  public initialize(world: World, camera?: THREE.Camera): void {
    this._world = world;
    const size = new THREE.Vector2();
    world.renderer.getSize(size);
    this._viewportWidth = size.x;
    this._viewportHeight = size.y;
    const cam = camera ?? world.camera;
    this._ensureCameraForController(cam);
  }

  public setOrthoSize(size: number): void {
    this._orthoSize = size;
    this._updateOrthoProjection();
  }

  public setPosition(x: number, y: number, z: number): void {
    this._stopFollow();
    this._currentPosition.set(x, y, z);
    this._applyPositionToCamera();
  }

  public followObject(object: THREE.Object3D, easing?: number): void {
    this._followObject = object;
    this._followPosition = null;
    this._followEasing = easing ?? DEFAULT_EASING;
    this._currentPosition.copy(this._getTargetPosition());
  }

  public followPosition(x: number, y: number, z: number, easing?: number): void {
    this._followObject = null;
    this._followPosition = new THREE.Vector3(x, y, z);
    this._followEasing = easing ?? DEFAULT_EASING;
    this._currentPosition.set(x, y, z);
  }

  public stopFollow(): void {
    this._stopFollow();
  }

  public activate(): void {
    this._active = true;
  }

  public deactivate(): void {
    this._active = false;
  }

  public isActive(): boolean {
    return this._active;
  }

  public update(dtSeconds: number): void {
    if (!this._active || !this._camera || !this._world) return;
    if (this._followObject !== null || this._followPosition !== null) {
      const target = this._getTargetPosition();
      const k = this._followEasing;
      const t = 1 - Math.exp(-k * dtSeconds);
      this._currentPosition.lerp(target, t);
      this._applyPositionToCamera();
    }
  }

  public resize(width: number, height: number): void {
    this._viewportWidth = width;
    this._viewportHeight = height;
    this._updateOrthoProjection();
    if (this._perspectiveCamera) {
      this._perspectiveCamera.aspect = width / height;
      this._perspectiveCamera.updateProjectionMatrix();
    }
  }

  private _stopFollow(): void {
    this._followObject = null;
    this._followPosition = null;
  }

  private _getTargetPosition(): THREE.Vector3 {
    if (this._followObject) {
      this._followObject.getWorldPosition(this._tempVector);
      return this._tempVector.clone();
    }
    if (this._followPosition) return this._followPosition.clone();
    return this._currentPosition.clone();
  }

  private _ensureCameraForController(existing: THREE.Camera | null): void {
    if (!this._activeController) return;
    const needsOrtho = this._activeController.isOrtho;

    if (needsOrtho) {
      if (!this._orthoCamera) {
        const aspect = this._viewportWidth / this._viewportHeight;
        const h = this._orthoSize / 2;
        const w = (this._orthoSize * aspect) / 2;
        this._orthoCamera = new THREE.OrthographicCamera(-w, w, h, -h, 0.1, 1000);
      }
      this._camera = this._orthoCamera;
      if (this._perspectiveCamera && this._world) {
        this._perspectiveCamera.getWorldDirection(this._tempDirection);
        this._currentPosition.copy(this._perspectiveCamera.position).addScaledVector(this._tempDirection, PERSPECTIVE_TO_ORTHO_OFFSET);
      }
    } else {
      if (!this._perspectiveCamera) {
        this._perspectiveCamera = new THREE.PerspectiveCamera(60, this._viewportWidth / this._viewportHeight, 0.1, 1000);
      }
      this._camera = this._perspectiveCamera;
      if (this._orthoCamera && this._world) {
        const focus = this._activeController.getFocusFromOrthoPosition(this._orthoCamera.position, this._orthoSize);
        this._currentPosition.copy(focus);
      }
    }

    if (existing && this._camera !== existing) {
      this._currentPosition.copy(existing.position);
    }

    if (this._world) {
      this._world.setActiveCamera(this._camera);
    }

    this._updateOrthoProjection();
  }

  private _updateOrthoProjection(): void {
    if (!this._orthoCamera) return;
    const aspect = this._viewportWidth / this._viewportHeight;
    const h = this._orthoSize / 2;
    const w = (this._orthoSize * aspect) / 2;
    this._orthoCamera.left = -w;
    this._orthoCamera.right = w;
    this._orthoCamera.top = h;
    this._orthoCamera.bottom = -h;
    this._orthoCamera.near = 0.1;
    this._orthoCamera.far = 1000;
    this._orthoCamera.updateProjectionMatrix();
  }

  private _applyPositionToCamera(): void {
    if (!this._camera || !this._activeController) return;
    this._activeController.applyPositionToCamera(this._camera, this._currentPosition, this._orthoSize);
  }
}
