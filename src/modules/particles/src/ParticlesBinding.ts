import { ModuleBinding } from "../../../core/ModuleBinding.js";
import type { DIContainer } from "../../../core/di/DIContainer.js";

import { IParticleModel } from "./models/IParticleModel.js";
import { ParticleModel } from "./models/ParticleModel.js";
import { ParticleBudget } from "./utilities/ParticleBudget.js";
import { ParticleManager } from "./utilities/ParticleManager.js";

/**
 * Module binding for the particle subsystem.
 *
 * Binds:
 *   - `ParticleModel` (also under `IParticleModel`) — read-only view of
 *     the registered emitter set, for debug overlays and observers
 *   - `ParticleBudget` — global cap on live particle count, shared
 *     across world and HUD emitters
 *   - `ParticleManager` — owns model mutation and the per-frame tick;
 *     resolved by the app to call `update(dt)` and by controllers to
 *     register / unregister emitters
 *
 * No views, no assets — this module is pure runtime plumbing. Renderer-
 * specific emitter base classes (`WorldParticleEmitter` extending
 * `THREE.Group`, `HudParticleEmitter` extending `Pixi.Container`) ship
 * alongside it for game code to subclass.
 *
 * The app must drive the particle system by calling
 * `particleManager.update(dtSeconds)` from its `onStep` hook (mirroring
 * the `TimelineManager.update` wiring pattern). The binding does not
 * auto-register with `UpdateManager` so the app keeps control of update
 * ordering — typically tick the timeline first (so burst tracks can
 * emit) and the particle manager second (so emitted particles age and
 * render in the same frame).
 *
 * The default `ParticleBudget` cap is 4096; pass a different value to
 * the binding constructor to override.
 */
export class ParticlesBinding extends ModuleBinding {
  private readonly _budgetMax: number;

  public constructor(budgetMax: number = 4096) {
    super();
    this._budgetMax = budgetMax;
  }

  public configureDI(diContainer: DIContainer, viewDiContainer: DIContainer): void {
    const model = new ParticleModel();
    const budget = new ParticleBudget(this._budgetMax);
    const manager = new ParticleManager(model, budget);
    diContainer.bindInstance(ParticleModel, model, [IParticleModel]);
    diContainer.bindInstance(ParticleBudget, budget);
    diContainer.bindInstance(ParticleManager, manager);
    // Views need the budget at construction time to instantiate emitters
    // (e.g. `new MuzzleFlashEmitter(budget, config)` from a `WorldViewBase`
    // that owns its FX). The manager and model stay diContainer-only —
    // controllers register / unregister, views just construct.
    viewDiContainer.bindInstance(ParticleBudget, budget);
  }
}
