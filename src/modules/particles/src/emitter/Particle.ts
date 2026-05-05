/**
 * Framework-managed wrapper around a single particle. Holds the
 * lifetime fields the framework owns (`_life`, `_maxLife`) and a `data`
 * slot the subclass populates with its renderer-specific payload (a
 * THREE.Sprite, a Pixi sprite, a struct of vectors — whatever the
 * concrete emitter creates in `createParticleData`).
 *
 * Behaviors operate on `Particle<TData>`: read `progress` / `age` /
 * `remainingLife` for fade and animation curves, and reach into `data`
 * for renderer-specific writes (position, color, scale, ...).
 *
 * Lifetime fields are mutated only by `EmitterCore` through the
 * `_setLife` / `_decrementLife` internal methods. Subclasses and
 * behaviors should treat them as read-only.
 */
export class Particle<TData> {
  public data!: TData;
  private _life = 0;
  private _maxLife = 0;

  public get maxLife(): number {
    return this._maxLife;
  }

  public get remainingLife(): number {
    return this._life;
  }

  public get age(): number {
    return this._maxLife - this._life;
  }

  /** 0 at spawn, 1 when life is exhausted. */
  public get progress(): number {
    if (this._maxLife <= 0) return 1;
    const t = 1 - this._life / this._maxLife;
    if (t < 0) return 0;
    if (t > 1) return 1;
    return t;
  }

  /** @internal Invoked by `EmitterCore` on spawn. */
  public _setLife(life: number, maxLife: number): void {
    this._life = life;
    this._maxLife = maxLife;
  }

  /** @internal Invoked by `EmitterCore` each tick. Returns the new remaining life. */
  public _decrementLife(dtSeconds: number): number {
    this._life -= dtSeconds;
    return this._life;
  }
}
