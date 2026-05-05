import { Track } from "../../../timeline/src/models/Track.js";
import type { IParticleEmitter } from "../emitter/IParticleEmitter.js";

const TRACK_TYPE = "particle-burst";

export type ParticleBurstTrackOptions = {
  /** Number of particles to emit immediately on `onStart`. Default 0. */
  burst?: number;
  /** Particles per second emitted across the duration. Default 0 (burst-only). */
  rate?: number;
  /** Total length of the burst window, in seconds. Required (matches `Track.duration`). */
  duration: number;
  /** Delay before the burst starts, in seconds. */
  delay?: number;
};

/**
 * A time-bounded driver that calls `spawn(n)` on a registered
 * `IParticleEmitter` from a `TimelineManager`. Produces a synchronous
 * one-shot burst on start (`burst`) and/or a sustained spawn rate over
 * the track's duration (`rate`).
 *
 * Mirrors the role of `CameraShakeTrack` in the `gamecamera` module:
 * a track that drives a long-lived manager-side service for a bounded
 * span of time. The emitter is owned by gameplay code and outlives
 * the track — multiple tracks can drive the same emitter concurrently
 * (e.g. rapid-fire weapon producing overlapping muzzle flashes), and
 * the track does not change the emitter's own `rate` or `isEmitting`
 * state.
 *
 * The track's `rate` is independent of the emitter's `EmitterConfig.rate`
 * — both contribute spawns. Most burst-driven emitters (muzzle flash,
 * pickup pop) use `rate: 0` on the emitter and let the track drive all
 * emission.
 *
 * Demand is dropped, not accumulated, when the budget refuses (matches
 * `EmitterCore.update` policy): `floor(rate * dt)` is requested each
 * tick and any clipped portion is forgotten.
 *
 * Cancellation: canceling the track stops further emits but does not
 * affect particles already in flight — they age out through the
 * emitter's normal lifetime ticking. Use `emitter.destroy()` if you
 * want immediate teardown.
 */
export class ParticleBurstTrack extends Track {
  private readonly _emitter: IParticleEmitter;
  private readonly _burst: number;
  private readonly _rate: number;
  private _accum = 0;

  public constructor(emitter: IParticleEmitter, options: ParticleBurstTrackOptions) {
    super({ type: TRACK_TYPE, duration: options.duration, delay: options.delay ?? 0 });
    this._emitter = emitter;
    this._burst = Math.max(0, options.burst ?? 0);
    this._rate = Math.max(0, options.rate ?? 0);
  }

  protected override onStart(): void {
    if (this._burst > 0) this._emitter.spawn(this._burst);
  }

  protected override onUpdate(_elapsedSeconds: number, dtSeconds: number): void {
    if (this._rate <= 0) return;
    this._accum += this._rate * dtSeconds;
    const n = Math.floor(this._accum);
    if (n > 0) {
      this._emitter.spawn(n);
      this._accum -= n;
    }
  }
}
