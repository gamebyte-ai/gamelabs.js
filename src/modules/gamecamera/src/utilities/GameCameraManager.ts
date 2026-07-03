import type { Camera, Euler, Object3D } from "three";
import { OrthographicCamera, PerspectiveCamera, Vector2, Vector3 } from "three";
import type { World } from "../../../../core/world/World.js";
import type { ICameraController } from "../controllers/ICameraController.js";
import type { ICameraConstraint } from "./ICameraConstraint.js";
import type { ICameraFollow } from "./ICameraFollow.js";
import { FollowObject } from "./FollowObject.js";
import { FollowPosition } from "./FollowPosition.js";
import { DEFAULT_ORTHO_SIZE, DEFAULT_FOV, DEFAULT_EASING, PERSPECTIVE_TO_ORTHO_OFFSET } from "../constants/GameCameraDefaults.js";

export type CameraOffset = {
  focus?: Vector3;
  localPosition?: Vector3;
  worldPosition?: Vector3;
  rotation?: Euler;
  fov?: number;
  orthoSize?: number;
};

export class GameCameraManager {
  private _world: World | null = null;
  private _camera: Camera | null = null;
  private _orthoCamera: OrthographicCamera | null = null;
  private _perspectiveCamera: PerspectiveCamera | null = null;
  private _activeController: ICameraController | null = null;
  private _active = true;
  private _orthoSize = DEFAULT_ORTHO_SIZE;
  private _baseFov = DEFAULT_FOV;
  private _viewportWidth = 1;
  private _viewportHeight = 1;
  private _follow: ICameraFollow | null = null;
  private _currentPosition = new Vector3();
  private _offsets = new Map<string, CameraOffset>();
  private _constraints = new Map<string, ICameraConstraint>();
  private _tempVector = new Vector3();
  private _tempDirection = new Vector3();
  private _tempFocusBias = new Vector3();
  private _tempLocalBias = new Vector3();
  private _tempWorldBias = new Vector3();
  private _tempBiasedFocus = new Vector3();

  public getCamera(): Camera | null {
    return this._camera;
  }

  public setController(controller: ICameraController): void {
    this._activeController = controller;
    this._ensureCameraForController(this._camera);
    this._applyPositionToCamera();
  }

  public initialize(world: World, camera?: Camera): void {
    this._world = world;
    const size = new Vector2();
    world.renderer.getSize(size);
    this._viewportWidth = size.x;
    this._viewportHeight = size.y;
    const cam = camera ?? world.camera;
    this._ensureCameraForController(cam);
  }

  public setOrthoSize(size: number): void {
    this._orthoSize = size;
    this._writeOrthoProjection(this._orthoSize);
    this._applyPositionToCamera();
  }

  public setBaseFov(fov: number): void {
    this._baseFov = fov;
    if (this._perspectiveCamera) {
      this._perspectiveCamera.fov = fov;
      this._perspectiveCamera.updateProjectionMatrix();
    }
    this._applyPositionToCamera();
  }

  public setPosition(x: number, y: number, z: number): void {
    this._follow = null;
    this._currentPosition.set(x, y, z);
    this._applyPositionToCamera();
  }

  public setFollow(follow: ICameraFollow | null): void {
    this._follow = follow;
  }

  public getFollow(): ICameraFollow | null {
    return this._follow;
  }

  public followObject(object: Object3D, easing?: number): void {
    this._follow = new FollowObject(object, easing ?? DEFAULT_EASING);
    object.getWorldPosition(this._tempVector);
    this._currentPosition.copy(this._tempVector);
  }

  public followPosition(x: number, y: number, z: number, easing?: number): void {
    this._follow = new FollowPosition(x, y, z, easing ?? DEFAULT_EASING);
    this._currentPosition.set(x, y, z);
  }

  public stopFollow(): void {
    this._follow = null;
  }

  public setOffset(id: string, offset: CameraOffset): void {
    this._offsets.set(id, offset);
    this._applyPositionToCamera();
  }

  public clearOffset(id: string): void {
    if (this._offsets.delete(id)) {
      this._applyPositionToCamera();
    }
  }

  public clearAllOffsets(): void {
    if (this._offsets.size === 0) return;
    this._offsets.clear();
    this._applyPositionToCamera();
  }

  public getOffset(id: string): CameraOffset | null {
    return this._offsets.get(id) ?? null;
  }

  public setConstraint(id: string, constraint: ICameraConstraint): void {
    this._constraints.set(id, constraint);
    this._applyPositionToCamera();
  }

  public clearConstraint(id: string): void {
    if (this._constraints.delete(id)) {
      this._applyPositionToCamera();
    }
  }

  public clearAllConstraints(): void {
    if (this._constraints.size === 0) return;
    this._constraints.clear();
    this._applyPositionToCamera();
  }

  public getConstraint(id: string): ICameraConstraint | null {
    return this._constraints.get(id) ?? null;
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
    if (this._follow) {
      this._follow.step(this._currentPosition, dtSeconds);
    }
    this._applyPositionToCamera();
  }

  public resize(width: number, height: number): void {
    this._viewportWidth = width;
    this._viewportHeight = height;
    this._writeOrthoProjection(this._orthoSize);
    if (this._perspectiveCamera) {
      this._perspectiveCamera.aspect = width / height;
      this._perspectiveCamera.updateProjectionMatrix();
    }
    this._applyPositionToCamera();
  }

  private _ensureCameraForController(existing: Camera | null): void {
    if (!this._activeController) return;
    const needsOrtho = this._activeController.isOrtho;
    let transitioned = false;

    if (needsOrtho) {
      if (!this._orthoCamera) {
        const aspect = this._viewportWidth / this._viewportHeight;
        const h = this._orthoSize / 2;
        const w = (this._orthoSize * aspect) / 2;
        this._orthoCamera = new OrthographicCamera(-w, w, h, -h, 0.1, 1000);
      }
      this._camera = this._orthoCamera;
      if (this._perspectiveCamera && this._world) {
        this._perspectiveCamera.getWorldDirection(this._tempDirection);
        this._currentPosition.copy(this._perspectiveCamera.position).addScaledVector(this._tempDirection, PERSPECTIVE_TO_ORTHO_OFFSET);
        transitioned = true;
      }
    } else {
      if (!this._perspectiveCamera) {
        this._perspectiveCamera = new PerspectiveCamera(this._baseFov, this._viewportWidth / this._viewportHeight, 0.1, 1000);
      }
      this._camera = this._perspectiveCamera;
      if (this._orthoCamera && this._world) {
        const focus = this._activeController.getFocusFromOrthoPosition(this._orthoCamera.position, this._orthoSize);
        this._currentPosition.copy(focus);
        transitioned = true;
      }
    }

    if (!transitioned && existing && this._camera !== existing) {
      this._currentPosition.copy(existing.position);
    }

    if (this._world) {
      this._world.setActiveCamera(this._camera);
    }

    this._writeOrthoProjection(this._orthoSize);
  }

  private _writeOrthoProjection(size: number): void {
    if (!this._orthoCamera) return;
    const aspect = this._viewportWidth / this._viewportHeight;
    const h = size / 2;
    const w = (size * aspect) / 2;
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

    const focusBias = this._tempFocusBias.set(0, 0, 0);
    const localBias = this._tempLocalBias.set(0, 0, 0);
    const worldBias = this._tempWorldBias.set(0, 0, 0);
    let rotX = 0;
    let rotY = 0;
    let rotZ = 0;
    let fovDelta = 0;
    let orthoSizeDelta = 0;

    for (const o of this._offsets.values()) {
      if (o.focus) focusBias.add(o.focus);
      if (o.localPosition) localBias.add(o.localPosition);
      if (o.worldPosition) worldBias.add(o.worldPosition);
      if (o.rotation) {
        rotX += o.rotation.x;
        rotY += o.rotation.y;
        rotZ += o.rotation.z;
      }
      if (o.fov !== undefined) fovDelta += o.fov;
      if (o.orthoSize !== undefined) orthoSizeDelta += o.orthoSize;
    }

    const effectiveOrthoSize = Math.max(0.001, this._orthoSize + orthoSizeDelta);
    const biasedFocus = this._tempBiasedFocus.copy(this._currentPosition).add(focusBias);

    for (const c of this._constraints.values()) {
      if (c.applyToFocus) c.applyToFocus(biasedFocus);
    }

    if (this._camera === this._orthoCamera) {
      this._writeOrthoProjection(effectiveOrthoSize);
    } else if (this._camera === this._perspectiveCamera && this._perspectiveCamera) {
      const fov = Math.min(179, Math.max(1, this._baseFov + fovDelta));
      if (this._perspectiveCamera.fov !== fov) {
        this._perspectiveCamera.fov = fov;
        this._perspectiveCamera.updateProjectionMatrix();
      }
    }

    this._activeController.applyPositionToCamera(this._camera, biasedFocus, effectiveOrthoSize);

    if (worldBias.lengthSq() > 0) this._camera.position.add(worldBias);
    if (localBias.lengthSq() > 0) {
      this._camera.translateX(localBias.x);
      this._camera.translateY(localBias.y);
      this._camera.translateZ(localBias.z);
    }
    if (rotX !== 0 || rotY !== 0 || rotZ !== 0) {
      this._camera.rotation.x += rotX;
      this._camera.rotation.y += rotY;
      this._camera.rotation.z += rotZ;
    }

    for (const c of this._constraints.values()) {
      if (c.applyToCamera) c.applyToCamera(this._camera.position, this._camera.rotation);
    }
  }
}
