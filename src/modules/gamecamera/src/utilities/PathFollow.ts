import type * as THREE from "three";
import type { ICameraFollow } from "./ICameraFollow.js";

/**
 * Follow strategy that linearly interpolates the focal point along a
 * list of waypoints over a fixed duration with equal time per segment.
 *
 * Once the elapsed time reaches `duration`, the focal point holds at
 * the last waypoint until the strategy is replaced. Useful as a
 * cutscene primitive — pair it with a `Track` (see
 * `CinematicPathTrack`) to drive a rail-cam over N seconds and restore
 * the previous follow when done.
 *
 * Waypoints are stored by reference; mutating them between frames
 * updates the path live. With fewer than two waypoints the focal point
 * either stays at the single waypoint or doesn't move at all.
 */
export class PathFollow implements ICameraFollow {
  private readonly _waypoints: readonly THREE.Vector3[];
  private readonly _duration: number;
  private _elapsed = 0;

  public constructor(waypoints: readonly THREE.Vector3[], duration: number) {
    this._waypoints = waypoints;
    this._duration = Math.max(0, duration);
  }

  public get duration(): number {
    return this._duration;
  }

  public get elapsed(): number {
    return this._elapsed;
  }

  public step(current: THREE.Vector3, dtSeconds: number): void {
    const n = this._waypoints.length;
    if (n === 0) return;
    if (n === 1) {
      current.copy(this._waypoints[0]!);
      return;
    }

    this._elapsed = Math.min(this._elapsed + dtSeconds, this._duration);
    const progress = this._duration > 0 ? this._elapsed / this._duration : 1;
    const segments = n - 1;
    const segProgress = progress * segments;
    const segIdx = Math.min(segments - 1, Math.floor(segProgress));
    const localT = segProgress - segIdx;
    const a = this._waypoints[segIdx]!;
    const b = this._waypoints[segIdx + 1]!;
    current.lerpVectors(a, b, localT);
  }
}
