import { InjectionToken } from "../../../../core/di/InjectionToken.js";
import type { IParticleEmitter } from "../emitter/IParticleEmitter.js";

/**
 * Read-only view of the live particle state.
 *
 * Holds the set of currently registered emitters. Mutation (register /
 * unregister) goes through `ParticleManager`; everyone else resolves
 * `IParticleModel` to query.
 *
 * Useful for debug overlays, telemetry, and any subsystem that needs to
 * inspect what is running without owning the emitters.
 */
export interface IParticleModel {
  readonly emitterCount: number;
  getAllEmitters(): IParticleEmitter[];
  getEmittersByType(type: string): IParticleEmitter[];
}

export const IParticleModel = new InjectionToken<IParticleModel>("IParticleModel");
