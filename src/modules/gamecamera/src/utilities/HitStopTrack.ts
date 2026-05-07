import { Track } from "../../../timeline/src/models/Track.js";
import type { GameCameraManager, CameraOffset } from "./GameCameraManager.js";
import type { ICameraFollow } from "./ICameraFollow.js";

const TRACK_TYPE = "camera-hit-stop";
const OFFSET_ID_PREFIX = "camera-hit-stop:";
const DEFAULT_DURATION = 0.1;

export type HitStopTrackOptions = {
  /** Hold duration in seconds. Default 0.1 (100 ms — a typical fighting-game hit-stop). */
  duration?: number;
  /** Delay before the hit-stop kicks in. Default 0. */
  delay?: number;
  /** Optional FOV pulse (peak signed delta in degrees). Defaults to none — pure hold. */
  fovDelta?: number;
  /** Optional orthoSize pulse. Defaults to none. */
  orthoSizeDelta?: number;
};

/**
 * Camera-side hit-stop: freezes the active follow strategy for a brief
 * window and optionally writes a sin-curve FOV / orthoSize pulse for
 * emphasis. Restores the previous follow on end or cancel.
 *
 * This only freezes the **camera follow** — game-time scaling (the
 * other half of canonical hit-stop) is a global concern and lives in
 * the game's own update loop.
 */
export class HitStopTrack extends Track {
  private readonly _camera: GameCameraManager;
  private readonly _fovDelta: number | undefined;
  private readonly _orthoSizeDelta: number | undefined;
  private _previousFollow: ICameraFollow | null = null;
  private _offsetId = "";
  private _hasPulse = false;

  public constructor(camera: GameCameraManager, options: HitStopTrackOptions = {}) {
    super({ type: TRACK_TYPE, duration: options.duration ?? DEFAULT_DURATION, delay: options.delay ?? 0 });
    this._camera = camera;
    this._fovDelta = options.fovDelta;
    this._orthoSizeDelta = options.orthoSizeDelta;
    this._hasPulse = options.fovDelta !== undefined || options.orthoSizeDelta !== undefined;
  }

  protected override onStart(): void {
    this._previousFollow = this._camera.getFollow();
    this._camera.setFollow(null);
    if (this._hasPulse) this._offsetId = `${OFFSET_ID_PREFIX}${this.uniqueId}`;
  }

  protected override onUpdate(elapsedSeconds: number): void {
    if (!this._hasPulse) return;
    const progress = this.duration > 0 ? Math.min(1, elapsedSeconds / this.duration) : 0;
    const curve = Math.sin(Math.PI * progress);
    const offset: CameraOffset = {};
    if (this._fovDelta !== undefined) offset.fov = this._fovDelta * curve;
    if (this._orthoSizeDelta !== undefined) offset.orthoSize = this._orthoSizeDelta * curve;
    this._camera.setOffset(this._offsetId, offset);
  }

  protected override onEnd(): void {
    this._camera.setFollow(this._previousFollow);
    if (this._hasPulse && this._offsetId !== "") this._camera.clearOffset(this._offsetId);
  }

  protected override onCancel(): void {
    this._camera.setFollow(this._previousFollow);
    if (this._hasPulse && this._offsetId !== "") this._camera.clearOffset(this._offsetId);
  }
}
