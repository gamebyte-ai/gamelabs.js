import type { Object3D } from "three";
import { Vector3 } from "three";
import type { ICameraFollow } from "./ICameraFollow.js";
import { DEFAULT_EASING } from "../constants/GameCameraDefaults.js";

/**
 * Follow strategy that lerps the focal point toward a `Object3D`'s
 * world position with frame-rate-independent exponential easing
 * (`1 - exp(-k * dt)`). Same behavior as the legacy
 * `manager.followObject(...)` convenience method.
 *
 * `easing` is the rate constant (higher = snappier). The default of `8`
 * gives a comfortable feel for player-follow at 60 fps.
 */
export class FollowObject implements ICameraFollow {
  private readonly _object: Object3D;
  private readonly _easing: number;
  private readonly _temp = new Vector3();

  public constructor(object: Object3D, easing = DEFAULT_EASING) {
    this._object = object;
    this._easing = easing;
  }

  public get object(): Object3D {
    return this._object;
  }

  public get easing(): number {
    return this._easing;
  }

  public step(current: Vector3, dtSeconds: number): void {
    this._object.getWorldPosition(this._temp);
    const t = 1 - Math.exp(-this._easing * dtSeconds);
    current.lerp(this._temp, t);
  }
}
