export interface FixedStepAccumulatorOptions {
  /** Simulation frequency in steps per second. Default 60. */
  hz?: number;
  /**
   * Maximum fixed sub-steps to run for a single `consume()` call. Caps how
   * much simulation time a single frame can drain, preventing the "spiral of
   * death" where a slow frame schedules more steps than the next frame can
   * afford. Default 5.
   */
  maxSubSteps?: number;
}

/**
 * Generic fixed-timestep clock.
 *
 * Feeds variable wall-clock delta time (from the render loop) and emits a
 * whole number of fixed-size sub-steps to simulate, carrying the leftover
 * remainder forward. This decouples simulation rate from render rate so
 * physics (or any deterministic stepped system) behaves identically across
 * machines and frame rates.
 *
 * Renderer- and engine-agnostic — owns no physics state, so it lives in core
 * alongside `UpdateManager` rather than inside a physics module. The physics
 * modules consume it; games may use it directly for any fixed-step system.
 *
 * Typical usage:
 * ```ts
 * const steps = accumulator.consume(dtSeconds);
 * for (let i = 0; i < steps; i++) engine.step(accumulator.fixedDt);
 * // render using accumulator.alpha to interpolate between prev/current state
 * ```
 */
export class FixedStepAccumulator {
  private readonly _fixedDt: number;
  private readonly _maxSubSteps: number;
  private _accumulator = 0;

  public constructor(options?: FixedStepAccumulatorOptions) {
    const hz = options?.hz ?? 60;
    if (!(hz > 0)) throw new Error("FixedStepAccumulator: hz must be > 0");
    this._fixedDt = 1 / hz;
    this._maxSubSteps = Math.max(1, Math.floor(options?.maxSubSteps ?? 5));
  }

  /** Duration of one fixed sub-step, in seconds. */
  public get fixedDt(): number {
    return this._fixedDt;
  }

  /**
   * Fraction in `[0, 1)` of a fixed step that has elapsed but not yet been
   * simulated. Use as the lerp factor between the previous and current
   * simulation snapshot when rendering.
   */
  public get alpha(): number {
    return this._accumulator / this._fixedDt;
  }

  /**
   * Add elapsed wall-clock time and return how many fixed sub-steps to run
   * now. The backlog is clamped to `maxSubSteps * fixedDt` before stepping,
   * so a single call never returns more than `maxSubSteps`. Non-positive or
   * non-finite `dtSeconds` adds nothing (guards NaN from a stalled clock).
   */
  public consume(dtSeconds: number): number {
    if (Number.isFinite(dtSeconds) && dtSeconds > 0) {
      this._accumulator += dtSeconds;
    }

    const max = this._maxSubSteps * this._fixedDt;
    if (this._accumulator > max) this._accumulator = max;

    let steps = 0;
    while (this._accumulator >= this._fixedDt && steps < this._maxSubSteps) {
      this._accumulator -= this._fixedDt;
      steps++;
    }
    return steps;
  }

  /** Discard any accumulated remainder (e.g. after a hard scene reset). */
  public reset(): void {
    this._accumulator = 0;
  }
}
