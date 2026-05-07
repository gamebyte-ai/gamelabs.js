import type { ParticleBudget } from "../utilities/ParticleBudget.js";
import type { EmitterConfig } from "./EmitterConfig.js";
import type { IParticleBehavior } from "./IParticleBehavior.js";
import { Particle } from "./Particle.js";

/**
 * Renderer-specific callbacks supplied by `WorldParticleEmitter` /
 * `HudParticleEmitter`. The core uses these to allocate user payloads
 * lazily and to add/remove particles from the scene graph as they
 * spawn and die.
 */
export interface EmitterHooks<TData> {
  createData(): TData;
  disposeData(data: TData): void;
  attach(data: TData): void;
  detach(data: TData): void;
}

/**
 * Renderer-agnostic engine of a particle emitter. Owns the pool, the
 * active set, the spawn-rate accumulator, and the per-frame behavior
 * dispatch. Renderer-specific base classes (THREE / Pixi) wrap one of
 * these and forward `update` / `spawn` / `destroy` plus the four
 * `EmitterHooks` callbacks.
 *
 * Pool allocation is lazy — `Particle<TData>` instances and their
 * payloads are created on demand up to `config.maxParticles`. This
 * matters because the renderer-specific base class is constructed
 * before its subclass's constructor body runs; eager pre-allocation
 * here would call `createData()` before the subclass had a chance to
 * initialize the fields its `createParticleData` reads (textures,
 * geometries, parent groups).
 *
 * Spawn arbitration:
 *   - `spawn(n)` clamps to remaining local capacity, then asks the
 *     shared `ParticleBudget` for that many slots.
 *   - Rate-driven spawning accumulates `rate * dt` and consumes the
 *     integer part each tick. Demand is **not** carried forward when
 *     the budget refuses — clipping ambient FX during heavy combat is
 *     desirable; accumulating and dumping a delayed burst the moment
 *     the budget frees is not.
 */
export class EmitterCore<TData> {
  private readonly _config: EmitterConfig;
  private readonly _budget: ParticleBudget;
  private readonly _hooks: EmitterHooks<TData>;
  public readonly behaviors: IParticleBehavior<TData>[] = [];

  private readonly _active: Particle<TData>[] = [];
  private readonly _pool: Particle<TData>[] = [];
  private _allocated = 0;
  private _accum = 0;
  private _alive = true;
  private _emitting = true;
  private _rate: number;

  public constructor(config: EmitterConfig, budget: ParticleBudget, hooks: EmitterHooks<TData>) {
    if (config.maxParticles < 0) throw new Error(`EmitterConfig.maxParticles must be >= 0 (got ${config.maxParticles})`);
    if (config.rate < 0) throw new Error(`EmitterConfig.rate must be >= 0 (got ${config.rate})`);
    if (config.lifetime.min < 0 || config.lifetime.max < config.lifetime.min) {
      throw new Error(`EmitterConfig.lifetime invalid: ${config.lifetime.min}..${config.lifetime.max}`);
    }
    this._config = config;
    this._budget = budget;
    this._hooks = hooks;
    this._rate = config.rate;
  }

  public get emitterType(): string {
    return this._config.type;
  }

  public get alive(): boolean {
    return this._alive;
  }

  public get isEmitting(): boolean {
    return this._emitting;
  }

  public get activeCount(): number {
    return this._active.length;
  }

  public get rate(): number {
    return this._rate;
  }

  public setEmitting(value: boolean): void {
    this._emitting = value;
  }

  /**
   * Update the rate-driven spawn rate (particles per second). Initialized
   * from `EmitterConfig.rate` and then mutable for emitters whose flow
   * scales with gameplay state — propulsion trails proportional to
   * speed, fire intensity proportional to fuel, etc.
   *
   * Setting rate to 0 disables rate-driven emission until raised again;
   * burst-driven emission via `spawn(n)` is unaffected.
   */
  public setRate(value: number): void {
    if (value < 0) throw new Error(`EmitterCore.setRate value must be >= 0 (got ${value})`);
    this._rate = value;
  }

  public spawn(n: number): number {
    if (!this._alive || n <= 0) return 0;
    const localRemaining = this._pool.length + (this._config.maxParticles - this._allocated);
    const localCap = Math.min(n, localRemaining);
    if (localCap <= 0) return 0;

    const granted = this._budget.request(localCap, this._config.priority ?? 0);
    if (granted <= 0) return 0;

    const lifeMin = this._config.lifetime.min;
    const lifeRange = this._config.lifetime.max - lifeMin;

    for (let i = 0; i < granted; i++) {
      const p = this.acquireParticle();
      const maxLife = lifeMin + Math.random() * lifeRange;
      p._setLife(maxLife, maxLife);
      this._active.push(p);
      this._hooks.attach(p.data);
      for (const b of this.behaviors) b.init?.(p);
    }

    return granted;
  }

  public update(dtSeconds: number): void {
    if (!this._alive) return;

    if (this._emitting && this._rate > 0) {
      this._accum += this._rate * dtSeconds;
      const n = Math.floor(this._accum);
      if (n > 0) {
        this.spawn(n);
        this._accum -= n;
      }
    } else {
      // Drop accumulated demand when paused or rate=0 so a long idle
      // window doesn't dump a delayed burst the moment emission resumes.
      this._accum = 0;
    }

    for (let i = this._active.length - 1; i >= 0; i--) {
      const p = this._active[i]!;
      const remaining = p._decrementLife(dtSeconds);
      if (remaining <= 0) {
        this._hooks.detach(p.data);
        this._budget.release(1);
        const last = this._active.length - 1;
        if (i !== last) this._active[i] = this._active[last]!;
        this._active.pop();
        this._pool.push(p);
        continue;
      }
      for (const b of this.behaviors) b.update(p, dtSeconds);
    }

    if (this._config.autoDestroy && !this._emitting && this._active.length === 0) {
      this._alive = false;
    }
  }

  public destroy(): void {
    if (!this._alive) return;
    this._alive = false;

    if (this._active.length > 0) {
      this._budget.release(this._active.length);
      for (const p of this._active) this._hooks.detach(p.data);
    }
    for (const p of this._active) this._hooks.disposeData(p.data);
    for (const p of this._pool) this._hooks.disposeData(p.data);
    this._active.length = 0;
    this._pool.length = 0;
    this._allocated = 0;
  }

  private acquireParticle(): Particle<TData> {
    const fromPool = this._pool.pop();
    if (fromPool) return fromPool;
    const p = new Particle<TData>();
    p.data = this._hooks.createData();
    this._allocated++;
    return p;
  }
}
