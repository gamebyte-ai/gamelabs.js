/**
 * Configuration for a particle emitter. Passed once at construction
 * and then read-only — emitters do not support live config swaps.
 *
 * `rate` and burst-driven emission are independent: an emitter with
 * `rate: 0` only spawns when external code calls `spawn(n)` (e.g. via
 * a `ParticleBurstTrack`), while an emitter with `rate > 0` continuously
 * spawns on each tick while `isEmitting` is true.
 */
export interface EmitterConfig {
  /** Stable, namespaced identifier (e.g. `"fx.muzzle-flash"`). Used by `ParticleManager.destroyByType`. */
  type: string;
  /** Particles per second emitted while `isEmitting` is true. `0` disables rate emission (burst-only). */
  rate: number;
  /** Hard upper bound on the local pool. Subject to the global `ParticleBudget`. */
  maxParticles: number;
  /** Random per-particle lifetime, uniform in `[min, max]`. */
  lifetime: { min: number; max: number };
  /** Higher-priority emitters will be allowed to evict lower-priority once the budget supports it. Default 0. */
  priority?: number;
  /** When true, the emitter sets `alive = false` once it stops emitting and the active set drains. Default false. */
  autoDestroy?: boolean;
}
