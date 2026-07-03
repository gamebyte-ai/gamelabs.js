# Particles Module

> **Build target:** Dual-renderer. `HudParticleEmitter` is World-independent (works in any entry). `WorldParticleEmitter` is **THREE-bound and requires a World** — only usable from the default `@gamebyte/gamelabsjs` entry.

View-side particle plumbing. A `ParticleManager` owns a registered set of `IParticleEmitter` instances and ticks them each frame; a `ParticleBudget` arbitrates a global cap shared across world (THREE) and HUD (Pixi) emitters; renderer-specific base classes (`WorldParticleEmitter`, `HudParticleEmitter`) handle pool management, lifetime ticking, and behavior dispatch on top of their respective scene-graph nodes.

## Purpose

- Replace ad-hoc per-feature particle code (manual sprite arrays, hand-rolled lifetime timers, leaked materials) with a single coordinator that handles pooling, budget, and the per-frame tick.
- Provide one mental model and one set of base classes for both world (THREE.js) and HUD (Pixi.js) FX, so a game written against the framework doesn't reinvent the loop on each side.
- Enforce a global cap on live particle count so any single feature can't monopolise the GPU when many emitters are active simultaneously.

## What lives where

| Concern                                          | Lives in framework     | Lives in game |
| ------------------------------------------------ | ---------------------- | ------------- |
| Spawn/despawn loop, lifetime ticking             | yes                    |               |
| Pooling                                          | yes                    |               |
| Global budget arbitration                        | yes                    |               |
| World/HUD scene-graph integration                | yes (via base classes) |               |
| Particle visual (Sprite, Mesh, Pixi sprite, ...) |                        | yes           |
| Behaviors (gravity, color, attractor, ...)       |                        | yes           |
| Emitter presets / spawn-shape configuration      |                        | yes           |

The framework provides the engine. The game writes the visuals and behaviors that ride on it.

## Usage

### Setup

Register `ParticlesBinding` and tick `ParticleManager.update(dt)` from the app's `onStep`. The binding registers the manager, model, and budget in the DI container; per `ModuleBinding` rules it does not auto-register with `UpdateManager`, so the app stays in control of update ordering.

```ts
import { GamelabsApp, ParticleManager, ParticlesBinding, TimelineBinding, TimelineManager } from "@gamebyte/gamelabsjs";

class MyApp extends GamelabsApp {
  private readonly _timelineBinding = new TimelineBinding();
  private readonly _particlesBinding = new ParticlesBinding(); // optional: pass a custom budget cap, default 4096
  private _timeline: TimelineManager | null = null;
  private _particles: ParticleManager | null = null;

  protected override registerModules(): void {
    this.addModule(this._timelineBinding);
    this.addModule(this._particlesBinding);
  }

  protected override configureDI(): void {
    this._timeline = this.diContainer.getInstance(TimelineManager);
    this._particles = this.diContainer.getInstance(ParticleManager);
  }

  protected override onStep(dt: number): void {
    super.onStep(dt);
    this._timeline?.update(dt); // burst tracks may call emitter.spawn(n)
    this._particles?.update(dt); // emitters consume the freshest spawn state, age particles
  }
}
```

### Define a world emitter

Subclass `WorldParticleEmitter<TData>` and provide four hooks. `TData` is your renderer-specific particle payload — whatever you want to attach to each particle (a `THREE.Sprite`, a `Mesh`, a `Points` vertex index, plus any per-particle state your behaviors read).

```ts
import * as THREE from "three";
import { type ParticleBudget, WorldParticleEmitter } from "@gamebyte/gamelabsjs";

type Spark = { sprite: THREE.Mesh; vx: number; vy: number };

class SparkEmitter extends WorldParticleEmitter<Spark> {
  private readonly _geometry = new THREE.PlaneGeometry(8, 8);

  public constructor(budget: ParticleBudget) {
    super(budget, {
      type: "fx.spark",
      rate: 0, // 0 = burst-only; raise to spawn continuously
      maxParticles: 200,
      lifetime: { min: 0.3, max: 0.6 },
    });
  }

  protected createParticleData(): Spark {
    const mat = new THREE.MeshBasicMaterial({ color: 0x88ee88, transparent: true, depthWrite: false });
    const sprite = new THREE.Mesh(this._geometry, mat);
    sprite.rotation.x = -Math.PI / 2;
    sprite.visible = false;
    this.add(sprite); // emitter is itself a THREE.Group
    return { sprite, vx: 0, vy: 0 };
  }

  protected disposeParticleData(d: Spark): void {
    (d.sprite.material as THREE.MeshBasicMaterial).dispose();
  }

  protected attachParticleData(d: Spark): void {
    d.sprite.visible = true;
  }
  protected detachParticleData(d: Spark): void {
    d.sprite.visible = false;
  }

  protected override onDestroy(): void {
    this._geometry.dispose(); // shared resources owned by the subclass
  }
}
```

Pool reuse goes through `attach` / `detach`, not `create` / `dispose`. Disposal only fires when the entire emitter is destroyed. The pool is allocated lazily — `createParticleData` is called on demand up to `maxParticles`, so subclass fields (textures, geometries) are guaranteed initialized when it first runs.

### Define a HUD emitter

Identical shape, but extends `Pixi.Container` instead of `THREE.Group` and `super.destroy()` cleans up the Pixi container automatically.

```ts
import { Sprite, Texture, type Container } from "pixi.js";
import { HudParticleEmitter, type ParticleBudget } from "@gamebyte/gamelabsjs";

type Glint = { sprite: Sprite };

class HudGlintEmitter extends HudParticleEmitter<Glint> {
  public constructor(
    budget: ParticleBudget,
    private readonly _texture: Texture,
  ) {
    super(budget, { type: "fx.hud-glint", rate: 0, maxParticles: 64, lifetime: { min: 0.4, max: 0.8 } });
  }

  protected createParticleData(): Glint {
    const sprite = new Sprite(this._texture);
    sprite.anchor.set(0.5);
    sprite.visible = false;
    this.addChild(sprite as unknown as Container);
    return { sprite };
  }

  protected disposeParticleData(d: Glint): void {
    d.sprite.destroy();
  }
  protected attachParticleData(d: Glint): void {
    d.sprite.visible = true;
  }
  protected detachParticleData(d: Glint): void {
    d.sprite.visible = false;
  }
}
```

### Wire up an emitter

Construct it, attach it to a scene-graph parent, register it with the manager. Game code typically does this from a controller — the view can construct the emitter (it has `ParticleBudget` from `viewDiContainer`) and expose it through `IParticleEmitter` so the controller can register it without depending on renderer types.

```ts
// World side
const emitter = new SparkEmitter(budget);
worldRoot.add(emitter); // THREE scene graph
particleManager.register(emitter); // tick loop

// HUD side
const hudEmitter = new HudGlintEmitter(budget, texture);
hud.addChild(HudLayer.Content, hudEmitter);
particleManager.register(hudEmitter);
```

To trigger spawns directly:

```ts
emitter.spawn(20); // returns the number actually granted (clamped by pool + budget)
```

To stop or resume rate-driven emission without unregistering:

```ts
emitter.setEmitting(false); // pause; in-flight particles age out
emitter.setRate(80); // change rate-driven spawn rate (particles/sec)
```

To tear down explicitly (otherwise the manager removes any emitter whose `alive` flips to `false`):

```ts
particleManager.destroyByType("fx.spark"); // destroys all matching emitters and removes them
emitter.destroy(); // or destroy a single instance directly
```

### Behaviors

Particle update logic is supplied via `IParticleBehavior<TData>`. Behaviors compose: an emitter runs `init` (if defined) on spawn for every behavior in order, then `update` once per tick on every behavior in order. Particles are `Particle<TData>` wrappers exposing framework-managed lifetime fields (`progress`, `age`, `maxLife`, `remainingLife`) and your `data` payload.

```ts
import type { IParticleBehavior, Particle } from "@gamebyte/gamelabsjs";

class FadeOverLife implements IParticleBehavior<Spark> {
  public update(p: Particle<Spark>, _dt: number): void {
    (p.data.sprite.material as THREE.MeshBasicMaterial).opacity = 1 - p.progress;
  }
}

class Drift implements IParticleBehavior<Spark> {
  public init(p: Particle<Spark>): void {
    const angle = Math.random() * Math.PI * 2;
    p.data.vx = Math.cos(angle) * 100;
    p.data.vy = Math.sin(angle) * 100;
  }
  public update(p: Particle<Spark>, dt: number): void {
    p.data.sprite.position.x += p.data.vx * dt;
    p.data.sprite.position.z += p.data.vy * dt;
  }
}

emitter.behaviors.push(new Drift(), new FadeOverLife());
```

Behaviors are `TData`-typed, so a behavior written for THREE-side particles can't be reused on Pixi-side particles. For shared concerns, factor a small structural convention onto your `TData` shapes (e.g. all your particle structs expose `position: { x, y }`) and write behaviors that target that shape.

### Burst from the timeline

`ParticleBurstTrack` is a `Track` that drives `IParticleEmitter.spawn(n)` from a `TimelineManager` for a bounded span of time. Mirrors the role of `CameraShakeTrack` in `gamecamera`: a track that drives a long-lived service for a bounded window. The emitter is owned by gameplay code and outlives the track — multiple tracks can drive the same emitter concurrently (e.g. rapid-fire weapon producing overlapping muzzle flashes).

```ts
import { ParticleBurstTrack } from "@gamebyte/gamelabsjs";

timelineManager.add(
  new ParticleBurstTrack(emitter, {
    duration: 0.12, // emit window in seconds (matches Track.duration)
    burst: 8, // immediate puff on onStart
    rate: 40, // trailing spawns/sec across the duration
  }),
);
```

`burst` and `rate` are independent of the emitter's own `EmitterConfig.rate` — both contribute spawns. Most burst-driven emitters set `EmitterConfig.rate: 0` and let tracks drive all emission.

`delay` works the same way as on every other `Track`:

```ts
timelineManager.add(new ParticleBurstTrack(emitter, { duration: 0.5, burst: 30, delay: 1.2 }));
```

Cancellation of the track stops further `spawn(n)` calls but does not affect particles already in flight — they age out through the emitter's normal lifetime ticking. To kill an emitter and its in-flight particles immediately, use `emitter.destroy()` or `particleManager.destroyByType(type)`.

## Update ordering

Particles are a consumer of state set by other systems in the same frame. The manager should tick after producers:

```ts
protected override onStep(dt: number): void {
  super.onStep(dt);
  this._timeline?.update(dt);    // ParticleBurstTracks call emitter.spawn(n)
  this._camera?.update(dt);      // any camera-driven FX state lands
  this._particles?.update(dt);   // emitters consume the freshest state, render this frame
}
```

When a controller drives spawn state every frame (e.g. setting propulsion direction from player velocity), the controller's tick runs through `UpdateManager.tick(dt)` which the framework calls before `onStep` — so by the time `particleManager.update(dt)` runs, the controller has already pushed this frame's state to the emitter.

## Particle budget

`ParticleBudget` enforces a global cap on live particles. The cap defaults to 4096 and is set at binding construction:

```ts
new ParticlesBinding(8192); // raise the cap for particle-heavy games
```

Every spawn goes through the budget:

1. `emitter.spawn(n)` clamps to remaining local pool capacity.
2. The emitter calls `budget.request(localCap, priority)`.
3. The budget grants up to `min(requested, remaining)` slots and reserves them.
4. As particles die, the emitter calls `budget.release(1)` and the slot returns to the pool.

`priority` is in the API but **not yet used** for arbitration in this version — `request` is first-come, first-served. Eviction (low-priority emitters yielding capacity to higher-priority requests) can be added later without changing call sites; until then, set higher `priority` on gameplay-critical emitters anyway so the meaning is recorded for when arbitration lands.

Demand is dropped, not accumulated, when the budget is full. If a 100/sec rate emitter faces a saturated budget for five seconds, the moment the budget frees you don't get a 500-particle dump — you get the rate going forward only. Tested in `tests/Particles.test.ts`.

## Auto-destroy semantics

By default, emitters live until explicitly destroyed. Set `EmitterConfig.autoDestroy: true` for fire-and-forget emitters that should clean themselves up once they're idle and drained:

```ts
new SparkEmitter(budget, { ..., autoDestroy: true });
emitter.setEmitting(false);  // stop emitting; once active particles age out, alive flips to false
                             // and ParticleManager removes + destroys on the next tick
```

Without `autoDestroy`, a paused-and-drained emitter stays registered indefinitely until you call `emitter.destroy()` or `particleManager.destroyByType(type)`. Most persistent emitters (a torch flame on an entity, a HUD ambient sparkle) want this behavior — gameplay code holds the reference and decides when the entity goes away.

## DI bindings

`ParticlesBinding` registers:

- **diContainer** — `ParticleManager`, `ParticleModel` (also under `IParticleModel`), `ParticleBudget`. Resolved by controllers and the app for registration, querying, and budget tuning.
- **viewDiContainer** — `ParticleBudget` only. Views need it at construction time to instantiate emitters; the manager and model stay diContainer-only so controllers own registration and views don't reach across the architectural boundary.

Views that own an emitter typically expose it through `IParticleEmitter` (renderer-agnostic) so the controller can register / unregister without manipulating renderer types — see the examples repository for the full pattern.

## Exports

- `ParticlesBinding` — Module binding. Optional `budgetMax` constructor argument.
- `ParticleManager` — Owns the registered emitter set and the per-frame tick. API: `register`, `unregister`, `update`, `destroyByType`, `destroyAll`, `budget`.
- `IParticleModel` / `ParticleModel` — Read-only / concrete particle state. Surface: `emitterCount`, `getAllEmitters`, `getEmittersByType`.
- `ParticleBudget` — Global cap. API: `max`, `used`, `remaining`, `request`, `release`.
- `IParticleEmitter` — Renderer-agnostic surface. Required: `emitterType`, `alive`, `spawn`, `update`, `destroy`. (Named `emitterType` because `THREE.Group.type` is reserved for serialization; named `spawn` because `Pixi.Container.emit` is the EventEmitter method.)
- `WorldParticleEmitter<TData>` — Abstract THREE-side base. Subclass hooks: `createParticleData`, `disposeParticleData`, `attachParticleData`, `detachParticleData`, optional `onDestroy`. Public surface: `emitterType`, `alive`, `isEmitting`, `activeCount`, `behaviors`, `rate`, `setEmitting`, `setRate`, `spawn`, `update`, `destroy`.
- `HudParticleEmitter<TData>` — Abstract Pixi-side base. Same surface as `WorldParticleEmitter`.
- `Particle<TData>` — Framework-managed wrapper. Read-only fields: `data`, `maxLife`, `remainingLife`, `age`, `progress`.
- `IParticleBehavior<TData>` — Per-particle update hook. Optional `init(p)`, required `update(p, dt)`.
- `EmitterConfig` — Constructor options: `{ type, rate, maxParticles, lifetime: { min, max }, priority?, autoDestroy? }`.
- `ParticleBurstTrack` / `ParticleBurstTrackOptions` — Timeline-driven emitter driver: `{ duration, burst?, rate?, delay? }`.
