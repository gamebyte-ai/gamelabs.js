import type * as THREE from "three";

/**
 * Pluggable post-processor for camera state. Same compositional model
 * as `CameraOffset`: register by id with `manager.setConstraint(id, c)`,
 * remove with `clearConstraint(id)`. Constraints run each frame in
 * insertion order; each one sees the previous one's output.
 *
 * Two hooks, both optional — implement only what the constraint needs:
 *   - `applyToFocus` runs after offset summation, before the active
 *     controller projects from the focal point. Use it to alter WHERE
 *     the camera looks (dead-zone follow, look-ahead bias, snap-to-volume).
 *   - `applyToCamera` runs after the controller and after world / local /
 *     rotation offsets have been applied. Use it to clamp the camera's
 *     final pose (level bounds, collision pull-in).
 *
 * Implementations should mutate the inputs in-place — these methods run
 * every frame and per-call allocations add up.
 *
 * Insertion order matters when multiple constraints overlap. Map
 * iteration in JS is insertion order, so the manager runs them in the
 * order they were registered. Register a `SnapToVolumeConstraint` before
 * a `BoundsConstraint` so the snap can't be clobbered by the clamp.
 */
export interface ICameraConstraint {
  applyToFocus?(focus: THREE.Vector3): void;
  applyToCamera?(position: THREE.Vector3, rotation: THREE.Euler): void;
}
