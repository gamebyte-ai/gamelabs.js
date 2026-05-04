import * as THREE from "three";
import { Track } from "../../../timeline/src/models/Track.js";
import type { GameCameraManager } from "./GameCameraManager.js";

const TRACK_TYPE = "camera-shake";
const OFFSET_ID_PREFIX = "camera-shake:";

export type CameraShakeTrackOptions = {
  /** Peak local-position offset in world units; decays linearly to 0 over the duration. */
  amplitude: number;
  /** Total length of the shake in seconds. */
  duration: number;
  /** Delay before the shake starts, in seconds. */
  delay?: number;
};

/**
 * A single camera-shake event living on a `TimelineManager`. Adds a
 * named offset to `GameCameraManager` whose magnitude is randomized each
 * frame and decays linearly from `amplitude` to 0 over `duration`. The
 * offset is cleared when the track ends or is canceled.
 *
 * Each track owns a unique offset slot keyed by its `uniqueId`, so
 * multiple shakes can run concurrently and stack additively — unlike a
 * single-slot shake manager that would have to discard or clamp
 * overlapping events.
 */
export class CameraShakeTrack extends Track {
  private readonly _camera: GameCameraManager;
  private readonly _amplitude: number;
  private readonly _offset = new THREE.Vector3();
  private _offsetId = "";

  public constructor(camera: GameCameraManager, options: CameraShakeTrackOptions) {
    super({ type: TRACK_TYPE, duration: options.duration, delay: options.delay ?? 0 });
    this._camera = camera;
    this._amplitude = options.amplitude;
  }

  protected override onStart(): void {
    this._offsetId = `${OFFSET_ID_PREFIX}${this.uniqueId}`;
  }

  protected override onUpdate(elapsedSeconds: number): void {
    const remaining = this.duration > 0 ? Math.max(0, 1 - elapsedSeconds / this.duration) : 0;
    const a = this._amplitude * remaining;
    this._offset.set((Math.random() * 2 - 1) * a, (Math.random() * 2 - 1) * a, 0);
    this._camera.setOffset(this._offsetId, { localPosition: this._offset });
  }

  protected override onEnd(): void {
    this._camera.clearOffset(this._offsetId);
  }

  protected override onCancel(): void {
    if (this._offsetId !== "") this._camera.clearOffset(this._offsetId);
  }
}
