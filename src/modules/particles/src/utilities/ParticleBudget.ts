/**
 * Global cap on the number of live particles across all emitters
 * (world and HUD combined). Emitters call `request(n, priority)` before
 * spawning and `release(n)` when particles die.
 *
 * Budget arbitration is intentionally simple in this first pass:
 * `request` returns `min(requested, remaining)` regardless of priority.
 * The `priority` parameter is part of the public API so eviction
 * (low-priority emitters yielding capacity to high-priority requests)
 * can be added later without changing call sites.
 *
 * The budget is shared across world and HUD emitters by design — a
 * single frame-wide cap prevents either side from monopolising GPU and
 * keeps total particle work bounded regardless of how many emitters are
 * registered.
 */
export class ParticleBudget {
  private readonly _max: number;
  private _used = 0;

  public constructor(max: number) {
    if (max < 0) throw new Error(`ParticleBudget max must be >= 0 (got ${max})`);
    this._max = max;
  }

  public get max(): number {
    return this._max;
  }

  public get used(): number {
    return this._used;
  }

  public get remaining(): number {
    return this._max - this._used;
  }

  /**
   * Reserve up to `requested` slots. Returns the number actually granted
   * (`0..requested`). Callers must spawn exactly that many particles and
   * later `release` them as they die.
   *
   * `priority` is unused in this implementation but reserved for future
   * eviction policies. Higher numbers will be allowed to displace lower
   * once eviction is wired up; until then it is ignored.
   */
  public request(requested: number, _priority: number): number {
    if (requested <= 0) return 0;
    const granted = Math.min(requested, this.remaining);
    this._used += granted;
    return granted;
  }

  public release(count: number): void {
    if (count <= 0) return;
    this._used -= count;
    if (this._used < 0) this._used = 0;
  }
}
