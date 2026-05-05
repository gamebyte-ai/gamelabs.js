import type { Particle } from "./Particle.js";

/**
 * Per-particle update hook supplied by the game. Behaviors compose:
 * an emitter runs `init` (if defined) on spawn for every behavior in
 * order, and then `update` once per tick on every behavior in order.
 *
 * Behaviors are renderer-specific by virtue of `TData` — a behavior
 * written for a THREE-side particle struct (with a `THREE.Sprite` /
 * `THREE.Vector3`) cannot be reused on the Pixi side and vice versa.
 * For reuse across renderers, factor shared concerns into small
 * `TData`-shape conventions (e.g. `{ position: { x, y } }`) and write
 * thin renderer-specific particle structs that conform to them.
 */
export interface IParticleBehavior<TData> {
  init?(particle: Particle<TData>): void;
  update(particle: Particle<TData>, dtSeconds: number): void;
}
