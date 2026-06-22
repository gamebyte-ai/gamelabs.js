import { Vector3 } from "three";
import type { ICameraConstraint } from "./ICameraConstraint.js";

export type DeadZonePlane = "xz" | "xy" | "yz";

export type DeadZoneFocusConstraintOptions = {
  /**
   * Plane the dead-zone window lives on. `"xz"` matches a topdown camera
   * (X is the horizontal axis, Z is the depth axis), `"xy"` matches a
   * front 2D camera, `"yz"` is for side-on rigs. Default `"xz"`.
   */
  plane?: DeadZonePlane;
  /** Half-extent on the first axis of the plane (`x` for `"xz"`/`"xy"`, `y` for `"yz"`). */
  halfWidth: number;
  /** Half-extent on the second axis of the plane (`z` for `"xz"`/`"yz"`, `y` for `"xy"`). */
  halfHeight: number;
};

/**
 * Holds the focal point still while the requested focus stays inside an
 * axis-aligned window on the chosen plane; once the requested focus
 * leaves the window, the focal point snaps so the requested focus is
 * back on the window edge. The axis perpendicular to the plane is
 * tracked freely (no clamp).
 *
 * Runs in the `applyToFocus` hook, so the manager's normal follow easing
 * still smooths the transition between snapped focal points.
 *
 * The first call is treated as a seed — the focal point starts centered
 * on whatever the manager passed in, so there's no initial jump.
 */
export class DeadZoneFocusConstraint implements ICameraConstraint {
  private readonly _axisA: "x" | "y" | "z";
  private readonly _axisB: "x" | "y" | "z";
  private readonly _offAxis: "x" | "y" | "z";
  private readonly _halfA: number;
  private readonly _halfB: number;
  private readonly _last = new Vector3();
  private _hasLast = false;

  public constructor(options: DeadZoneFocusConstraintOptions) {
    const plane = options.plane ?? "xz";
    this._axisA = plane[0] as "x" | "y" | "z";
    this._axisB = plane[1] as "x" | "y" | "z";
    const allAxes = ["x", "y", "z"] as const;
    this._offAxis = allAxes.find((a) => a !== this._axisA && a !== this._axisB)!;
    this._halfA = options.halfWidth;
    this._halfB = options.halfHeight;
  }

  public applyToFocus(focus: Vector3): void {
    if (!this._hasLast) {
      this._last.copy(focus);
      this._hasLast = true;
      return;
    }
    const a = this._axisA;
    const b = this._axisB;
    const off = this._offAxis;

    const da = focus[a] - this._last[a];
    if (da > this._halfA) this._last[a] = focus[a] - this._halfA;
    else if (da < -this._halfA) this._last[a] = focus[a] + this._halfA;

    const db = focus[b] - this._last[b];
    if (db > this._halfB) this._last[b] = focus[b] - this._halfB;
    else if (db < -this._halfB) this._last[b] = focus[b] + this._halfB;

    this._last[off] = focus[off];
    focus.copy(this._last);
  }
}
