import { Track } from "../../../timeline/src/models/Track.js";
import type { GameCameraManager, CameraOffset } from "./GameCameraManager.js";

const TRACK_TYPE = "camera-zoom-punch";
const OFFSET_ID_PREFIX = "camera-zoom-punch:";

export type ZoomPunchTrackOptions = {
  /** Total duration of the punch in seconds (rise + fall). */
  duration: number;
  /** Delay before the punch starts. Default 0. */
  delay?: number;
  /** Peak FOV offset in degrees (signed). Negative = zoom in. */
  fovDelta?: number;
  /** Peak orthoSize offset (signed). Negative = zoom in (smaller frustum). */
  orthoSizeDelta?: number;
};

/**
 * A momentary FOV / orthoSize pulse with a `sin(π·progress)` curve —
 * rises from 0 to peak at the midpoint, then falls back to 0. Used for
 * impact feedback (hits, explosions, ability triggers).
 *
 * Pass `fovDelta` for perspective cameras, `orthoSizeDelta` for ortho,
 * or both if your app switches projections at runtime — only the active
 * projection's offset is read by the manager.
 *
 * Concurrent punches stack additively via per-track offset slots, so
 * two hits within the same window add their peaks.
 */
export class ZoomPunchTrack extends Track {
  private readonly _camera: GameCameraManager;
  private readonly _fovDelta: number | undefined;
  private readonly _orthoSizeDelta: number | undefined;
  private _offsetId = "";

  public constructor(camera: GameCameraManager, options: ZoomPunchTrackOptions) {
    super({ type: TRACK_TYPE, duration: options.duration, delay: options.delay ?? 0 });
    this._camera = camera;
    this._fovDelta = options.fovDelta;
    this._orthoSizeDelta = options.orthoSizeDelta;
  }

  protected override onStart(): void {
    this._offsetId = `${OFFSET_ID_PREFIX}${this.uniqueId}`;
  }

  protected override onUpdate(elapsedSeconds: number): void {
    const progress = this.duration > 0 ? Math.min(1, elapsedSeconds / this.duration) : 0;
    const curve = Math.sin(Math.PI * progress);
    const offset: CameraOffset = {};
    if (this._fovDelta !== undefined) offset.fov = this._fovDelta * curve;
    if (this._orthoSizeDelta !== undefined) offset.orthoSize = this._orthoSizeDelta * curve;
    this._camera.setOffset(this._offsetId, offset);
  }

  protected override onEnd(): void {
    this._camera.clearOffset(this._offsetId);
  }

  protected override onCancel(): void {
    if (this._offsetId !== "") this._camera.clearOffset(this._offsetId);
  }
}
