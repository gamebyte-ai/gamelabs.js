import * as THREE from "three";
import { Track } from "../../../timeline/src/models/Track.js";
import type { GameCameraManager } from "./GameCameraManager.js";

const TRACK_TYPE = "camera-dolly-zoom";
const OFFSET_ID_PREFIX = "camera-dolly-zoom:";

export type DollyZoomTrackOptions = {
  /** Total length of the dolly-zoom in seconds. */
  duration: number;
  /** Delay before the effect starts. Default 0. */
  delay?: number;
  /** Object or fixed point used as the size-locked subject. */
  target: THREE.Object3D | THREE.Vector3;
  /** FOV offset in degrees applied at progress=1 (signed). Negative = narrow / zoom in. */
  fovDelta: number;
  /**
   * Progress curve `[0,1] → [0,1]`. Default linear (one-shot ramp). For
   * a rise-and-return Vertigo pulse use `t => Math.sin(t * Math.PI)`.
   */
  curve?: (t: number) => number;
};

/**
 * The Hitchcock "Vertigo" effect: changes FOV while dollying the camera
 * along its forward axis so the subject stays the same size on screen
 * — the foreground is locked while the background size shifts
 * dramatically.
 *
 * Perspective cameras only. On a non-perspective camera the track
 * silently no-ops (initial state is recorded as inactive).
 *
 * The track reads the camera's FOV and world position at `onStart`,
 * snapshots the forward direction toward the target, and writes a
 * per-frame `fov` + `worldPosition` offset that maintains the
 * `D · tan(F/2) = const` invariant. Cancellation clears the offset and
 * restores normal projection.
 */
export class DollyZoomTrack extends Track {
  private readonly _camera: GameCameraManager;
  private readonly _target: THREE.Object3D | THREE.Vector3;
  private readonly _fovDeltaPeak: number;
  private readonly _curve: (t: number) => number;
  private readonly _forward = new THREE.Vector3();
  private readonly _tempCamPos = new THREE.Vector3();
  private readonly _tempTargetPos = new THREE.Vector3();
  private readonly _tempOffsetVec = new THREE.Vector3();
  private _offsetId = "";
  private _initialFovDeg = 0;
  private _initialDistance = 0;
  private _inactive = false;

  public constructor(camera: GameCameraManager, options: DollyZoomTrackOptions) {
    super({ type: TRACK_TYPE, duration: options.duration, delay: options.delay ?? 0 });
    this._camera = camera;
    this._target = options.target;
    this._fovDeltaPeak = options.fovDelta;
    this._curve = options.curve ?? ((t) => t);
  }

  protected override onStart(): void {
    this._offsetId = `${OFFSET_ID_PREFIX}${this.uniqueId}`;
    const cam = this._camera.getCamera();
    if (!(cam instanceof THREE.PerspectiveCamera)) {
      this._inactive = true;
      return;
    }
    this._initialFovDeg = cam.fov;
    cam.getWorldPosition(this._tempCamPos);
    this._readTargetPos(this._tempTargetPos);
    this._forward.copy(this._tempTargetPos).sub(this._tempCamPos);
    this._initialDistance = this._forward.length();
    if (this._initialDistance > 0) {
      this._forward.divideScalar(this._initialDistance);
    } else {
      this._inactive = true;
    }
  }

  protected override onUpdate(elapsedSeconds: number): void {
    if (this._inactive) return;
    const rawProgress = this.duration > 0 ? Math.min(1, elapsedSeconds / this.duration) : 1;
    const t = this._curve(rawProgress);
    const fovDeltaNow = this._fovDeltaPeak * t;
    const fovNow = this._initialFovDeg + fovDeltaNow;
    const tanF0Half = Math.tan(THREE.MathUtils.degToRad(this._initialFovDeg) / 2);
    const tanFHalf = Math.tan(THREE.MathUtils.degToRad(fovNow) / 2);
    if (tanFHalf <= 0) return;
    const desiredDistance = (this._initialDistance * tanF0Half) / tanFHalf;
    const distanceDelta = desiredDistance - this._initialDistance;
    this._tempOffsetVec.copy(this._forward).multiplyScalar(-distanceDelta);
    this._camera.setOffset(this._offsetId, {
      fov: fovDeltaNow,
      worldPosition: this._tempOffsetVec,
    });
  }

  protected override onEnd(): void {
    if (this._offsetId !== "") this._camera.clearOffset(this._offsetId);
  }

  protected override onCancel(): void {
    if (this._offsetId !== "") this._camera.clearOffset(this._offsetId);
  }

  private _readTargetPos(out: THREE.Vector3): void {
    if (this._target instanceof THREE.Object3D) this._target.getWorldPosition(out);
    else out.copy(this._target);
  }
}
