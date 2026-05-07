/**
 * Renderer-agnostic surface that the `ParticleManager` ticks each frame.
 *
 * Concrete emitter base classes (e.g. `WorldParticleEmitter`,
 * `HudParticleEmitter`) live in renderer-specific subfolders and
 * implement this interface on top of their respective scene-graph nodes
 * (THREE.Group, Pixi.Container). The manager itself does not import any
 * renderer types.
 *
 * Lifecycle:
 *   - Once registered, `update(dt)` is called every tick while `alive` is true.
 *   - When `alive` becomes false, the manager unregisters and calls
 *     `destroy()`. Emitters that need to defer death until in-flight
 *     particles age out should keep `alive = true` until their pool is
 *     empty, then flip the flag.
 *   - `emitterType` is used for bulk queries / cancellation by category.
 *     Use stable, namespaced strings (e.g. `"fx.muzzle-flash"`). Named
 *     `emitterType` rather than `type` because both `THREE.Group` and
 *     other scene-graph bases reserve `type` for their own use.
 *   - `spawn(n)` spawns up to `n` particles immediately, returning the
 *     number actually granted (clamped by both the local pool and the
 *     global `ParticleBudget`). External drivers like `ParticleBurstTrack`
 *     call this to push spawns from the timeline. Named `spawn` rather
 *     than `emit` because `Pixi.Container` already defines `emit` as
 *     the EventEmitter method.
 */
export interface IParticleEmitter {
  readonly emitterType: string;
  readonly alive: boolean;
  spawn(count: number): number;
  update(dtSeconds: number): void;
  destroy(): void;
}
