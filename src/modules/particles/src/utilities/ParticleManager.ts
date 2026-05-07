import type { IParticleEmitter } from "../emitter/IParticleEmitter.js";
import type { ParticleModel } from "../models/ParticleModel.js";
import type { ParticleBudget } from "./ParticleBudget.js";

/**
 * Coordinates the live set of `IParticleEmitter` instances. Registers /
 * unregisters emitters, advances them once per frame, and removes any
 * that report `alive === false`.
 *
 * Read access to the live emitter set lives on `IParticleModel`.
 * Callers that only need to query (debug overlays, telemetry) should
 * resolve `IParticleModel` rather than `ParticleManager`.
 *
 * The manager is hand-ticked: the app calls `update(dt)` from `onStep`.
 * Per `ModuleBinding` rules, the binding does not auto-register with
 * `UpdateManager` — the app stays in control of update ordering. When
 * combined with the timeline module, tick the timeline before the
 * particle manager so a `ParticleBurstTrack` can call `spawn()` on its
 * emitter before the manager advances particles for the frame:
 *
 * ```ts
 * protected override onStep(dt: number): void {
 *   super.onStep(dt);
 *   this._timelineManager?.update(dt);   // tracks may spawn particles
 *   this._particleManager?.update(dt);   // advance + render this frame
 * }
 * ```
 *
 * Emitters added during another emitter's `update` are deferred to the
 * next tick — iteration runs on a snapshot of the registered set, so
 * register/unregister calls triggered from within hooks are safe.
 */
export class ParticleManager {
  private readonly _model: ParticleModel;
  private readonly _budget: ParticleBudget;

  public constructor(model: ParticleModel, budget: ParticleBudget) {
    this._model = model;
    this._budget = budget;
  }

  public get budget(): ParticleBudget {
    return this._budget;
  }

  public register(emitter: IParticleEmitter): void {
    this._model.addEmitter(emitter);
  }

  public unregister(emitter: IParticleEmitter): boolean {
    return this._model.removeEmitter(emitter);
  }

  public destroyByType(type: string): number {
    let count = 0;
    for (const emitter of this._model.getEmittersByType(type)) {
      this._model.removeEmitter(emitter);
      emitter.destroy();
      count++;
    }
    return count;
  }

  public destroyAll(): void {
    const snapshot = this._model.getAllEmitters();
    this._model.clearEmitters();
    for (const emitter of snapshot) emitter.destroy();
  }

  public update(dtSeconds: number): void {
    const snapshot = this._model.getAllEmitters();
    for (const emitter of snapshot) {
      if (!emitter.alive) {
        this._model.removeEmitter(emitter);
        emitter.destroy();
        continue;
      }
      emitter.update(dtSeconds);
      if (!emitter.alive) {
        this._model.removeEmitter(emitter);
        emitter.destroy();
      }
    }
  }
}
