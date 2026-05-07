import type * as THREE from "three";

/**
 * Pluggable strategy for moving the camera's focal point toward a
 * target each frame. Same external/composable shape as
 * `ICameraConstraint`: register one with `manager.setFollow(strategy)`,
 * remove with `manager.setFollow(null)`. The manager invokes
 * `step(current, dt)` once per `update(dt)` call (before constraints
 * and offsets), and the strategy mutates `current` in place.
 *
 * Built-ins:
 *   - `FollowObject` — track a `THREE.Object3D`'s world position with
 *     exponential lerp easing (same behavior as the legacy
 *     `manager.followObject(...)` convenience method).
 *   - `FollowPosition` — track a fixed point with exponential lerp.
 *
 * Custom strategies cover everything from spring/critically-damped
 * follow (racing / vehicle), to group framing (centroid + auto-zoom),
 * to look-ahead bias from velocity, to snap-to-grid (turn-based).
 *
 * Strategies own their own state (target reference, easing constants,
 * spring velocity, etc.). They run before constraints, so a strategy's
 * output is what `applyToFocus` constraints see.
 */
export interface ICameraFollow {
  step(current: THREE.Vector3, dtSeconds: number): void;
}
