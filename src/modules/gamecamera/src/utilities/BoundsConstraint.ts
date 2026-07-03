import { Vector3 } from "three";
import type { ICameraConstraint } from "./ICameraConstraint.js";

export type BoundsConstraintOptions = {
  min: Vector3;
  max: Vector3;
};

/**
 * Clamps the camera's final position to an axis-aligned bounding box.
 *
 * Runs in the `applyToCamera` hook, so it sees the camera after the
 * controller and all offsets (including shake) have been applied. That
 * means a shake offset that would push the camera past the bound is
 * silently absorbed — usually what you want for level edges; if you
 * need the shake to "pile up" against the bound, do the bounds clamp
 * before adding the shake offset (i.e., a custom constraint that runs
 * earlier).
 *
 * Mutating the input vectors via `setMin` / `setMax` (or pulling a
 * reference out of `min` / `max` and modifying it) takes effect on the
 * next `applyToCamera` call. The manager re-applies on
 * `setConstraint` / `clearConstraint`, but external mutation requires
 * triggering a re-apply (e.g. by calling `manager.setConstraint(id, c)`
 * with the same instance).
 */
export class BoundsConstraint implements ICameraConstraint {
  private readonly _min = new Vector3();
  private readonly _max = new Vector3();

  public constructor(options: BoundsConstraintOptions) {
    this._min.copy(options.min);
    this._max.copy(options.max);
  }

  public get min(): Vector3 {
    return this._min;
  }

  public get max(): Vector3 {
    return this._max;
  }

  public setMin(min: Vector3): void {
    this._min.copy(min);
  }

  public setMax(max: Vector3): void {
    this._max.copy(max);
  }

  public applyToCamera(position: Vector3): void {
    if (position.x < this._min.x) position.x = this._min.x;
    else if (position.x > this._max.x) position.x = this._max.x;
    if (position.y < this._min.y) position.y = this._min.y;
    else if (position.y > this._max.y) position.y = this._max.y;
    if (position.z < this._min.z) position.z = this._min.z;
    else if (position.z > this._max.z) position.z = this._max.z;
  }
}
