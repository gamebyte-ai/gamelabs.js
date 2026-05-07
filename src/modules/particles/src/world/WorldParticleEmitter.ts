import * as THREE from "three";
import type { ParticleBudget } from "../utilities/ParticleBudget.js";
import type { EmitterConfig } from "../emitter/EmitterConfig.js";
import type { IParticleBehavior } from "../emitter/IParticleBehavior.js";
import type { IParticleEmitter } from "../emitter/IParticleEmitter.js";
import { EmitterCore } from "../emitter/EmitterCore.js";

/**
 * THREE-side base class for particle emitters. Extends `THREE.Group`
 * so it can be parented to any scene-graph node (the world root, an
 * entity, a bone) — particle spawn/render is done relative to this
 * group's transform, so an emitter parented to a moving anchor follows
 * automatically with no per-frame position copy.
 *
 * Subclasses implement four hooks: `createParticleData` allocates the
 * renderer payload (a `THREE.Sprite`, `Mesh`, `Points` instance...),
 * `disposeParticleData` frees it on destroy, and `attachParticleData`
 * / `detachParticleData` make a particle visible / invisible as it
 * spawns and dies. Pool reuse goes through detach/attach, not
 * dispose/create — disposal only happens when the entire emitter is
 * destroyed.
 *
 * Wiring:
 *   ```ts
 *   const emitter = new MuzzleFlashEmitter(budget, texture);
 *   muzzleAnchor.add(emitter);              // scene graph
 *   particleManager.register(emitter);      // tick loop
 *   ```
 *
 * `WorldParticleEmitter` is intentionally not a `WorldViewBase` — it
 * has no `IView` lifecycle, no controller, no input handling. Game code
 * that owns one is responsible for unregistering it from the
 * `ParticleManager` and calling `destroy()` when the owning entity
 * goes away (typically from the entity's view's `preDestroy()`). The
 * `autoDestroy` flag in `EmitterConfig` opts into self-removal once
 * the emitter stops emitting and drains.
 */
export abstract class WorldParticleEmitter<TData> extends THREE.Group implements IParticleEmitter {
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
    this.removeFromParent();
  }
}
