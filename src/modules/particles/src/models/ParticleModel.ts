import type { IParticleEmitter } from "../emitter/IParticleEmitter.js";
import type { IParticleModel } from "./IParticleModel.js";

/**
 * Holds the live particle state: the set of registered emitters.
 *
 * Read access is exposed through {@link IParticleModel}. Mutation
 * methods (`addEmitter`, `removeEmitter`, `clearEmitters`) are public on
 * the concrete class so `ParticleManager` can drive them, but
 * controllers and other observers should resolve `IParticleModel` and
 * use only the read-only surface.
 */
export class ParticleModel implements IParticleModel {
  private readonly _emitters = new Set<IParticleEmitter>();

  public get emitterCount(): number {
    return this._emitters.size;
  }

  public getAllEmitters(): IParticleEmitter[] {
    return Array.from(this._emitters);
  }

  public getEmittersByType(type: string): IParticleEmitter[] {
    const out: IParticleEmitter[] = [];
    for (const e of this._emitters) if (e.emitterType === type) out.push(e);
    return out;
  }

  public addEmitter(emitter: IParticleEmitter): void {
    this._emitters.add(emitter);
  }

  public removeEmitter(emitter: IParticleEmitter): boolean {
    return this._emitters.delete(emitter);
  }

  public clearEmitters(): void {
    this._emitters.clear();
  }
}
