import * as THREE from "three";
import type { ICameraFollow } from "./ICameraFollow.js";
import { DEFAULT_EASING } from "../constants/GameCameraDefaults.js";

/**
 * Follow strategy that lerps the focal point toward a fixed world
 * position with frame-rate-independent exponential easing
 * (`1 - exp(-k * dt)`). Same behavior as the legacy
 * `manager.followPosition(x, y, z, easing)` convenience method.
 *
 * Update the target via `setTarget(x, y, z)` while the strategy is
 * active — the camera eases toward the new point on subsequent ticks
 * (no snap).
 */
export class FollowPosition implements ICameraFollow {
  private readonly _target = new THREE.Vector3();
  private readonly _easing: number;

  public constructor(x: number, y: number, z: number, easing = DEFAULT_EASING) {
    this._target.set(x, y, z);
    this._easing = easing;
  }

  public get target(): THREE.Vector3 {
    return this._target;
  }

  public get easing(): number {
    return this._easing;
  }

  public setTarget(x: number, y: number, z: number): void {
    this._target.set(x, y, z);
  }

  public step(current: THREE.Vector3, dtSeconds: number): void {
    const t = 1 - Math.exp(-this._easing * dtSeconds);
    current.lerp(this._target, t);
  }
}
