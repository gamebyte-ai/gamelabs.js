import { Container } from "pixi.js";
import type { ParticleBudget } from "../utilities/ParticleBudget.js";
import type { EmitterConfig } from "../emitter/EmitterConfig.js";
import type { IParticleBehavior } from "../emitter/IParticleBehavior.js";
import type { IParticleEmitter } from "../emitter/IParticleEmitter.js";
import { EmitterCore } from "../emitter/EmitterCore.js";

/**
 * Pixi-side base class for particle emitters. Extends
 * `PIXI.Container` so it can be mounted into a `HudLayer` via
 * `IHud.addChild(layer, emitter)`. Particle spawn/render is done
 * relative to this container's transform; if mounted under
 * `HudLayer.Content` it scales with the HUD content layer, if
 * mounted under `HudLayer.Screen` it sits in absolute screen space.
 *
 * Subclasses implement four hooks: `createParticleData` allocates the
 * Pixi payload (`PIXI.Sprite`, `PIXI.Graphics`, etc.),
 * `disposeParticleData` frees it on destroy, and `attachParticleData`
 * / `detachParticleData` make a particle visible / invisible as it
 * spawns and dies. Pool reuse goes through detach/attach, not
 * dispose/create.
 *
 * Wiring:
 *   ```ts
 *   const emitter = new SparkleHudEmitter(budget);
 *   hud.addChild(HudLayer.Content, emitter);
 *   particleManager.register(emitter);
 *   ```
 *
 * `HudParticleEmitter` is intentionally not a `HudViewBase` — it has
 * no `IView` lifecycle, no controller, no input handling. The owning
 * controller is responsible for unregistering and calling `destroy()`
 * when the HUD element is torn down. `super.destroy()` is invoked at
 * the end of `destroy()` so the Pixi container itself is cleaned up.
 */
export abstract class HudParticleEmitter<TData> extends Container implements IParticleEmitter {
  private readonly _core: EmitterCore<TData>;

  public constructor(budget: ParticleBudget, config: EmitterConfig) {
    super();
    this._core = new EmitterCore<TData>(config, budget, {
      createData: () => this.createParticleData(),
      disposeData: (d) => this.disposeParticleData(d),
      attach: (d) => this.attachParticleData(d),
      detach: (d) => this.detachParticleData(d),
    });
  }

  protected abstract createParticleData(): TData;
  protected abstract disposeParticleData(data: TData): void;
  protected abstract attachParticleData(data: TData): void;
  protected abstract detachParticleData(data: TData): void;

  /** Optional hook for subclass-owned shared resources (textures, shared materials). */
  protected onDestroy(): void {}

  public get emitterType(): string {
    return this._core.emitterType;
  }

  public get alive(): boolean {
    return this._core.alive;
  }

  public get isEmitting(): boolean {
    return this._core.isEmitting;
  }

  public get activeCount(): number {
    return this._core.activeCount;
  }

  public get behaviors(): IParticleBehavior<TData>[] {
    return this._core.behaviors;
  }

  public get rate(): number {
    return this._core.rate;
  }

  public setEmitting(value: boolean): void {
    this._core.setEmitting(value);
  }

  public setRate(value: number): void {
    this._core.setRate(value);
  }

  public spawn(count: number): number {
    return this._core.spawn(count);
  }

  public update(dtSeconds: number): void {
    this._core.update(dtSeconds);
  }

  public destroy(): void {
    this._core.destroy();
    this.onDestroy();
    super.destroy();
  }
}
