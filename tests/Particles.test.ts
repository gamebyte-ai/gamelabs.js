import { describe, it, expect, vi } from "vitest";
import { ParticleBudget } from "../src/modules/particles/src/utilities/ParticleBudget.js";
import { ParticleManager } from "../src/modules/particles/src/utilities/ParticleManager.js";
import { ParticleModel } from "../src/modules/particles/src/models/ParticleModel.js";
import { EmitterCore, type EmitterHooks } from "../src/modules/particles/src/emitter/EmitterCore.js";
import type { EmitterConfig } from "../src/modules/particles/src/emitter/EmitterConfig.js";
import type { IParticleBehavior } from "../src/modules/particles/src/emitter/IParticleBehavior.js";
import type { IParticleEmitter } from "../src/modules/particles/src/emitter/IParticleEmitter.js";
import { ParticleBurstTrack } from "../src/modules/particles/src/tracks/ParticleBurstTrack.js";
import { TimelineModel } from "../src/modules/timeline/src/models/TimelineModel.js";
import { TimelineEvents } from "../src/modules/timeline/src/events/TimelineEvents.js";
import { TimelineManager } from "../src/modules/timeline/src/utilities/TimelineManager.js";

type FakeData = { id: number; attached: boolean; disposed: boolean };

function makeHooks(): { hooks: EmitterHooks<FakeData>; data: FakeData[] } {
  const data: FakeData[] = [];
  let nextId = 0;
  const hooks: EmitterHooks<FakeData> = {
    createData: () => {
      const d: FakeData = { id: nextId++, attached: false, disposed: false };
      data.push(d);
      return d;
    },
    disposeData: (d) => {
      d.disposed = true;
    },
    attach: (d) => {
      d.attached = true;
    },
    detach: (d) => {
      d.attached = false;
    },
  };
  return { hooks, data };
}

function makeCore(
  config: Partial<EmitterConfig> = {},
  budget?: ParticleBudget,
): { core: EmitterCore<FakeData>; data: FakeData[]; budget: ParticleBudget } {
  const { hooks, data } = makeHooks();
  const finalBudget = budget ?? new ParticleBudget(1024);
  const finalConfig: EmitterConfig = {
    type: "test",
    rate: 0,
    maxParticles: 8,
    lifetime: { min: 1, max: 1 },
    ...config,
  };
  return { core: new EmitterCore<FakeData>(finalConfig, finalBudget, hooks), data, budget: finalBudget };
}

describe("ParticleBudget", () => {
  it("clamps requests to remaining capacity", () => {
    const b = new ParticleBudget(10);
    expect(b.request(7, 0)).toBe(7);
    expect(b.used).toBe(7);
    expect(b.remaining).toBe(3);
    expect(b.request(5, 0)).toBe(3);
    expect(b.remaining).toBe(0);
    expect(b.request(1, 0)).toBe(0);
  });

  it("releases capacity back into the pool", () => {
    const b = new ParticleBudget(10);
    b.request(8, 0);
    b.release(5);
    expect(b.used).toBe(3);
    expect(b.remaining).toBe(7);
  });

  it("never lets used go negative", () => {
    const b = new ParticleBudget(10);
    b.release(20);
    expect(b.used).toBe(0);
  });

  it("treats non-positive requests as zero", () => {
    const b = new ParticleBudget(10);
    expect(b.request(0, 0)).toBe(0);
    expect(b.request(-3, 0)).toBe(0);
    expect(b.used).toBe(0);
  });

  it("rejects negative max", () => {
    expect(() => new ParticleBudget(-1)).toThrow();
  });
});

describe("EmitterCore", () => {
  it("lazily allocates particles up to maxParticles", () => {
    const { core, data } = makeCore({ maxParticles: 4 });
    expect(data).toHaveLength(0);
    expect(core.spawn(2)).toBe(2);
    expect(data).toHaveLength(2);
    expect(core.activeCount).toBe(2);
    expect(data.every((d) => d.attached)).toBe(true);
  });

  it("clamps emit to local maxParticles", () => {
    const { core } = makeCore({ maxParticles: 3 });
    expect(core.spawn(10)).toBe(3);
    expect(core.activeCount).toBe(3);
  });

  it("clamps emit to global budget", () => {
    const budget = new ParticleBudget(2);
    const { core } = makeCore({ maxParticles: 100 }, budget);
    expect(core.spawn(10)).toBe(2);
    expect(budget.used).toBe(2);
  });

  it("retires particles after their lifetime expires and returns them to the pool", () => {
    const { core, data, budget } = makeCore({ maxParticles: 4, lifetime: { min: 0.5, max: 0.5 } });
    core.spawn(2);
    expect(budget.used).toBe(2);
    core.update(0.6);
    expect(core.activeCount).toBe(0);
    expect(budget.used).toBe(0);
    expect(data.every((d) => !d.attached)).toBe(true);
    expect(core.spawn(2)).toBe(2);
    expect(data).toHaveLength(2); // pool was reused, not reallocated
  });

  it("invokes behavior init on spawn and update each tick", () => {
    const init = vi.fn();
    const update = vi.fn();
    const behavior: IParticleBehavior<FakeData> = { init, update };
    const { core } = makeCore({ maxParticles: 4, lifetime: { min: 1, max: 1 } });
    core.behaviors.push(behavior);
    core.spawn(2);
    expect(init).toHaveBeenCalledTimes(2);
    expect(update).not.toHaveBeenCalled();
    core.update(0.1);
    expect(update).toHaveBeenCalledTimes(2);
    core.update(0.1);
    expect(update).toHaveBeenCalledTimes(4);
  });

  it("does not call behavior update on a particle that retires this tick", () => {
    const update = vi.fn();
    const { core } = makeCore({ maxParticles: 4, lifetime: { min: 0.1, max: 0.1 } });
    core.behaviors.push({ update });
    core.spawn(1);
    core.update(0.2); // particle dies before update runs
    expect(update).not.toHaveBeenCalled();
    expect(core.activeCount).toBe(0);
  });

  it("emits from rate while isEmitting is true", () => {
    const { core } = makeCore({ rate: 10, maxParticles: 100, lifetime: { min: 100, max: 100 } });
    core.update(1);
    expect(core.activeCount).toBe(10);
  });

  it("does not emit from rate when paused", () => {
    const { core } = makeCore({ rate: 10, maxParticles: 100, lifetime: { min: 100, max: 100 } });
    core.setEmitting(false);
    core.update(1);
    expect(core.activeCount).toBe(0);
  });

  it("drops rate-driven demand when the budget is full", () => {
    const budget = new ParticleBudget(3);
    const { core } = makeCore({ rate: 100, maxParticles: 100, lifetime: { min: 100, max: 100 } }, budget);
    core.update(1); // wants 100, gets 3
    expect(core.activeCount).toBe(3);
    // Next tick: budget still full, no carryover demand should produce a backlog
    core.update(0.01);
    expect(core.activeCount).toBe(3);
  });

  it("autoDestroys once idle and drained when configured", () => {
    const { core } = makeCore({
      rate: 0,
      maxParticles: 4,
      lifetime: { min: 0.1, max: 0.1 },
      autoDestroy: true,
    });
    core.spawn(2);
    core.setEmitting(false);
    expect(core.alive).toBe(true);
    core.update(0.2); // particles expire
    expect(core.alive).toBe(false);
  });

  it("destroy releases active budget and disposes the entire pool", () => {
    const budget = new ParticleBudget(100);
    const { core, data } = makeCore({ maxParticles: 4 }, budget);
    core.spawn(3);
    core.update(0.1);
    core.spawn(0); // no-op
    expect(budget.used).toBe(3);
    core.destroy();
    expect(core.alive).toBe(false);
    expect(budget.used).toBe(0);
    expect(data.every((d) => d.disposed)).toBe(true);
  });

  it("destroy is idempotent", () => {
    const { core } = makeCore({ maxParticles: 2 });
    core.spawn(1);
    core.destroy();
    expect(() => core.destroy()).not.toThrow();
  });

  it("setRate updates rate-driven emission", () => {
    const { core } = makeCore({ rate: 0, maxParticles: 100, lifetime: { min: 100, max: 100 } });
    core.update(1);
    expect(core.activeCount).toBe(0);
    core.setRate(20);
    core.update(1);
    expect(core.activeCount).toBe(20);
    core.setRate(0);
    core.update(1);
    expect(core.activeCount).toBe(20);
  });

  it("setRate rejects negative values", () => {
    const { core } = makeCore();
    expect(() => core.setRate(-1)).toThrow();
  });

  it("rejects invalid lifetime config", () => {
    const budget = new ParticleBudget(10);
    const { hooks } = makeHooks();
    expect(
      () =>
        new EmitterCore<FakeData>(
          { type: "x", rate: 0, maxParticles: 1, lifetime: { min: 1, max: 0.5 } },
          budget,
          hooks,
        ),
    ).toThrow();
  });
});

class FakeEmitter implements IParticleEmitter {
  public readonly emitterType: string;
  public alive = true;
  public emitted: number[] = [];
  public ticks: number[] = [];
  public destroyed = false;

  public constructor(emitterType: string = "fake") {
    this.emitterType = emitterType;
  }

  public spawn(n: number): number {
    this.emitted.push(n);
    return n;
  }

  public update(dt: number): void {
    this.ticks.push(dt);
  }

  public destroy(): void {
    this.destroyed = true;
  }
}

describe("ParticleManager", () => {
  function makeManager(): { manager: ParticleManager; model: ParticleModel; budget: ParticleBudget } {
    const model = new ParticleModel();
    const budget = new ParticleBudget(1024);
    const manager = new ParticleManager(model, budget);
    return { manager, model, budget };
  }

  it("registers and ticks emitters each frame", () => {
    const { manager } = makeManager();
    const a = new FakeEmitter();
    const b = new FakeEmitter();
    manager.register(a);
    manager.register(b);
    manager.update(0.1);
    manager.update(0.2);
    expect(a.ticks).toEqual([0.1, 0.2]);
    expect(b.ticks).toEqual([0.1, 0.2]);
  });

  it("removes and destroys emitters that report alive=false during update", () => {
    const { manager, model } = makeManager();
    const e = new FakeEmitter();
    manager.register(e);
    e.alive = false;
    manager.update(0.1);
    expect(model.emitterCount).toBe(0);
    expect(e.destroyed).toBe(true);
  });

  it("removes an emitter that flips alive to false during its own update", () => {
    const { manager, model } = makeManager();
    const e = new FakeEmitter();
    e.update = (_dt: number) => {
      e.alive = false;
    };
    manager.register(e);
    manager.update(0.1);
    expect(model.emitterCount).toBe(0);
    expect(e.destroyed).toBe(true);
  });

  it("destroyByType destroys and removes only matching emitters", () => {
    const { manager, model } = makeManager();
    const a = new FakeEmitter("fx.a");
    const b = new FakeEmitter("fx.b");
    const c = new FakeEmitter("fx.a");
    manager.register(a);
    manager.register(b);
    manager.register(c);
    expect(manager.destroyByType("fx.a")).toBe(2);
    expect(model.emitterCount).toBe(1);
    expect(a.destroyed).toBe(true);
    expect(c.destroyed).toBe(true);
    expect(b.destroyed).toBe(false);
  });

  it("destroyAll destroys and clears every registered emitter", () => {
    const { manager, model } = makeManager();
    const a = new FakeEmitter();
    const b = new FakeEmitter();
    manager.register(a);
    manager.register(b);
    manager.destroyAll();
    expect(model.emitterCount).toBe(0);
    expect(a.destroyed).toBe(true);
    expect(b.destroyed).toBe(true);
  });

  it("survives register/unregister called from inside another emitter's update", () => {
    const { manager, model } = makeManager();
    const incoming = new FakeEmitter("incoming");
    const trigger = new FakeEmitter("trigger");
    trigger.update = () => {
      manager.register(incoming);
    };
    manager.register(trigger);
    manager.update(0.1);
    // trigger ticked normally; incoming was added but should be deferred to next tick
    expect(model.emitterCount).toBe(2);
    expect(incoming.ticks).toEqual([]);
    manager.update(0.1);
    expect(incoming.ticks).toEqual([0.1]);
  });
});

describe("ParticleBurstTrack", () => {
  function makeTimeline(): { timeline: TimelineManager; model: TimelineModel } {
    const model = new TimelineModel();
    const events = new TimelineEvents();
    const timeline = new TimelineManager(model, events);
    return { timeline, model };
  }

  it("emits the burst on start", () => {
    const { timeline } = makeTimeline();
    const e = new FakeEmitter();
    timeline.add(new ParticleBurstTrack(e, { duration: 0.5, burst: 12 }));
    timeline.update(0); // promotes pending tracks
    expect(e.emitted).toEqual([12]);
  });

  it("delays the burst when configured", () => {
    const { timeline } = makeTimeline();
    const e = new FakeEmitter();
    timeline.add(new ParticleBurstTrack(e, { duration: 0.5, burst: 5, delay: 1.0 }));
    timeline.update(0.5);
    expect(e.emitted).toEqual([]);
    timeline.update(0.5); // currentTime now 1.0
    expect(e.emitted).toEqual([5]);
  });

  it("emits at the configured rate across the duration", () => {
    const { timeline } = makeTimeline();
    const e = new FakeEmitter();
    timeline.add(new ParticleBurstTrack(e, { duration: 1.0, rate: 10 }));
    timeline.update(0); // start, no rate emit yet (no dt)
    expect(e.emitted).toEqual([]);
    timeline.update(0.1); // 1 particle
    timeline.update(0.1); // 1 particle
    timeline.update(0.05); // 0 (accumulator < 1)
    timeline.update(0.05); // 1 particle (accumulator hits 1)
    expect(e.emitted).toEqual([1, 1, 1]);
  });

  it("ends without further emits after duration", () => {
    const { timeline } = makeTimeline();
    const e = new FakeEmitter();
    timeline.add(new ParticleBurstTrack(e, { duration: 0.2, rate: 100 }));
    timeline.update(0.3); // overshoots, track ends in same tick
    const totalAfterEnd = e.emitted.reduce((a, b) => a + b, 0);
    timeline.update(0.5); // track is gone, no further emits
    expect(e.emitted.reduce((a, b) => a + b, 0)).toBe(totalAfterEnd);
  });

  it("does not change the emitter's own emitting state", () => {
    const { timeline } = makeTimeline();
    const e = new FakeEmitter();
    timeline.add(new ParticleBurstTrack(e, { duration: 0.5, burst: 1 }));
    timeline.update(0);
    expect(e.alive).toBe(true);
    expect(e.destroyed).toBe(false);
  });
});
