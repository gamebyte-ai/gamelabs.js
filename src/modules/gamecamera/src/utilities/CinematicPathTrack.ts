import type * as THREE from "three";
import { Track } from "../../../timeline/src/models/Track.js";
import type { GameCameraManager } from "./GameCameraManager.js";
import type { ICameraFollow } from "./ICameraFollow.js";
import { PathFollow } from "./PathFollow.js";

const TRACK_TYPE = "camera-cinematic-path";

export type CinematicPathTrackOptions = {
  /** Total length of the cutscene in seconds. */
  duration: number;
  /** Delay before the path starts. Default 0. */
  delay?: number;
  /** Waypoints in world space; the focal point is linearly interpolated through them with equal time per segment. */
  waypoints: readonly THREE.Vector3[];
};

/**
 * Time-bounded cutscene primitive: saves whatever follow strategy is
 * currently active, installs a `PathFollow` for the duration, then
 * restores the original strategy on natural end or cancel.
 *
 * Use for intro pans, end-of-level reveals, scripted boss approaches.
 * For a permanent rail camera (no restore), install a `PathFollow`
 * directly via `manager.setFollow(...)`.
 */
export class CinematicPathTrack extends Track {
  private readonly _camera: GameCameraManager;
  private readonly _waypoints: readonly THREE.Vector3[];
  private _previousFollow: ICameraFollow | null = null;

  public constructor(camera: GameCameraManager, options: CinematicPathTrackOptions) {
    super({ type: TRACK_TYPE, duration: options.duration, delay: options.delay ?? 0 });
    this._camera = camera;
    this._waypoints = options.waypoints;
  }

  protected override onStart(): void {
    this._previousFollow = this._camera.getFollow();
    this._camera.setFollow(new PathFollow(this._waypoints, this.duration));
  }

  protected override onEnd(): void {
    this._camera.setFollow(this._previousFollow);
  }

  protected override onCancel(): void {
    this._camera.setFollow(this._previousFollow);
  }
}
