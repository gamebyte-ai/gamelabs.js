# Physics Module Design — physics2d (matter-js) & physics3d (cannon-es)

**Date:** 2026-06-03
**Status:** Draft — pending approval
**Scope:** Optional physics modules for gamelabsjs, following the existing module/DI architecture.

## 1. Summary

Add two optional physics modules to the framework: `physics2d` wrapping **matter-js** (for HUD/Pixi-space 2D games) and `physics3d` wrapping **cannon-es** (for World/Three-space 3D games). Physics is exposed as a DI-bound manager (`Physics2DManager` / `Physics3DManager`) stepped on a fixed timestep from the update loop. Controllers create bodies, apply forces, subscribe to collision events, and sync view transforms each frame — the same Manager → Controller → View flow used by `GameCameraManager` and the hand-rolled physics in existing games.

Physics engines are **optional peer dependencies** delivered via **subpath exports** (`@gamebyte/gamelabsjs/physics2d`, `@gamebyte/gamelabsjs/physics3d`) so games that don't use physics never load them.

## 2. Goals

- Gameplay physics (collisions, forces, gravity, sensors) available to games without hand-rolling integration code per game.
- Zero footprint for games that don't opt in (no bundle weight, no runtime cost, no new install requirement).
- Headless unit-testability: full simulation runs under vitest with no renderer present.
- Deterministic frame behavior: fixed timestep, frame-rate independent.
- Game/controller code never imports `matter-js` / `cannon-es` directly — only the manager's typed API.

## 3. Non-goals

- No unified 2D/3D physics abstraction. The two managers share conventions (lifecycle, eventing, fixed timestep) but expose dimension-appropriate APIs — mirroring the framework's deliberate choice to expose Three and Pixi directly rather than abstract over them.
- No cross-platform determinism guarantee (matter-js does not provide it; acceptable for client-side games).
- No debug-draw view in v1 (planned as a follow-up; see §11).
- No cosmetic view-side physics helper in v1 (possible later phase; must remain gameplay-inert if added).

## 4. Decision record

Three architectures were considered:

| | A: View-side physics, events to controller | **B: DI-bound PhysicsManager (chosen)** | C: B + view-side cosmetic physics |
|---|---|---|---|
| Policy compliance (views render only; domain logic in utilities, testable headless) | violates | complies | complies |
| Headless tests | requires renderer | vitest-only | vitest-only |
| Mixed World+HUD games | two simulations, two truths | single source of truth | single source of truth |
| Transform data flow | dense per-body events (expensive direction) | pull-based read loop (cheap) | pull-based |
| Frame-rate independence | tied to render dt | fixed-timestep accumulator | fixed-timestep |

**Why not A:** physics produces gameplay-authoritative state (positions, collisions → win/lose). Rendering can live encapsulated in views because it is a write-only sink — no information flows back. Physics is a state producer; hosting it in the view makes the view a second model and inverts the framework's one-way Controller → View data flow. It also couples engine choice to renderer, which is ambiguous in games using both World (Three) and HUD (Pixi) simultaneously.

**Engine axis:** dimension (2D/3D), not renderer. A 3D game with a Pixi HUD uses `physics3d`; a 2D game uses `physics2d` regardless of whether it renders in World or HUD space.

**Engine choices:** matter-js (mature, pure JS, 2D) and cannon-es (maintained fork of cannon.js, pure JS, 3D). Rapier was considered and rejected for v1: WASM loading complicates the consuming game's bundler setup.

### Placement decision: everything in the module (concrete, no core interface)

Both the data types *and* the concrete managers (`Physics2DManager` / `Physics3DManager`) live entirely in the `physics2d` / `physics3d` subpath modules. The framework core gains **no** `IPhysics*` injection token and no physics types. Game/controller code injects and depends on the concrete `Physics2DManager` class directly.

Two alternatives were weighed and rejected:

- **Definition in core, impl in module** (token + types in the main entry, wrappers bind to the token in the subpath): gains mockability and engine-swap headroom, at the cost of a frozen core interface that this AI-codegen-consumed framework would have to maintain forever. Rejected — see asymmetry note below; we are not committing the core to a physics contract.
- **Everything in core** (engines as hard dependencies): every game, physics or not, pays install + bundle cost. Rejected outright.

**Consequences we accept by choosing concrete-in-module:**

1. **Engine swap is a breaking change, not a transparent one.** Because games bind to `Physics2DManager` (not an interface), replacing matter-js later means either keeping the class name + public surface stable (a wrapper-internals swap, still possible) or shipping a new manager class and migrating games. We are *not* claiming a free engine swap. The public API (§8) is nonetheless written to avoid leaking `Matter.*` / `CANNON.*` types, so a same-surface internals swap stays feasible — that is the only swap guarantee.
2. **Mocking in game tests binds to the concrete class.** Tests that fake physics will `vi.mock` the manager or subclass it. To keep this from being painful, the module ships an official `FakePhysics2D` / `FakePhysics3D` (a deterministic, engine-free stand-in with the same public surface) so game tests inject the fake instead of hand-rolling one. This is the mock story in lieu of an interface.
3. **No migration debt now, a heavier swap later.** This is the deliberate trade: ~0 core-surface work today; if an engine swap with a *different* public surface is ever needed, it is a module-major migration. Given physics API shape is well-understood (the existing hand-rolled physics in towerdefense/avoidance already exercises the needed operations), surface churn is judged low-risk.

## 5. Module layout

```
src/modules/physics2d/
  index.ts                      # subpath entry (re-exports src/)
  README.md
  src/
    Physics2DBinding.ts         # ModuleBinding — binds Physics2DManager into diContainer
    Physics2DManager.ts         # matter-js wrapper: world, bodies, step, events
    Physics2DSyncBag.ts         # boilerplate-reducing view-sync helper
    FakePhysics2D.ts            # engine-free deterministic stand-in for game tests
    types.ts                    # Body2DDef, Transform2D, ContactInfo2D, config
  tests → tests/modules/physics2d/*.test.ts

src/modules/physics3d/          # mirror structure, cannon-es, 3D types
```

`ModuleBinding` follows the established pattern (stateless, boot-time only):

```ts
export class Physics2DBinding extends ModuleBinding {
  public constructor(private readonly _config?: Physics2DConfig) { super(); }
  public override configureDI(diContainer: DIContainer): void {
    diContainer.bindInstance(Physics2DManager, new Physics2DManager(this._config));
  }
}
```

Note: managers take config via constructor and do **not** rely on `inject()` — sidestepping the known `bindInstance` inject asymmetry (ISSUES.md A1), same as `OnScreenControlManager`.

## 6. Lifecycle & frame ordering

App wiring is explicit, following the `GameCameraManager` precedent:

```ts
protected override registerModules(): void {
  this.addModule(new Physics2DBinding({ gravity: { x: 0, y: 980 } }));
}

protected override postInitialize(): void {
  this._physics = this.diContainer.getInstance(Physics2DManager);
  // Register with UpdateManager *here* — postInitialize runs before any gameplay
  // controller exists, so physics steps FIRST within updateManager.tick() each frame.
  this._physicsUnsub = this.updateManager.register((dt) => this._physics!.step(dt));
}
```

Resulting frame order:

```
requestAnimationFrame tick
└─ updateManager.tick(dt)
   ├─ 1. physics.step(dt)            ← fixed-timestep substeps + collision event drain
   └─ 2. controller updates           ← ops mutate state, read FRESH transforms, _syncView()
└─ app.onStep(dt)                     ← camera follow etc.
└─ world.render()
```

Controllers read post-step transforms in the same frame (no view lag). Forces applied by controllers take effect on the next physics step — standard semantics.

## 7. Fixed timestep & interpolation

Both managers use an identical accumulator (implemented once, shared internally):

- `fixedTimestepHz` (default **60**), `maxSubSteps` (default **5**).
- Incoming `dt` accumulates; the engine steps in fixed increments; leftover time carries over.
- Accumulated time is clamped to `maxSubSteps × fixedDt` (spiral-of-death guard; also absorbs huge dt after tab-background rAF pauses).
- `interpolation: true` (default): the manager keeps previous + current snapshots per body; `getTransform()` returns positions interpolated by the accumulator's leftover alpha, eliminating visual stutter when render Hz ≠ physics Hz.

cannon-es's built-in substepping is **not** used; one accumulator implementation keeps 2D/3D behavior identical.

## 8. Public API sketch (2D shown; 3D mirrors with Vec3/quaternion)

```ts
export type BodyId = number;

export interface Physics2DConfig {
  gravity?: { x: number; y: number };   // px/s², default { x: 0, y: 980 } (y-down, matches Pixi)
  fixedTimestepHz?: number;             // default 60
  maxSubSteps?: number;                 // default 5
  interpolation?: boolean;              // default true
  allowSleep?: boolean;                 // default true
}

export interface Body2DDef {
  shape:
    | { kind: "circle"; radius: number }
    | { kind: "rect"; width: number; height: number }
    | { kind: "polygon"; vertices: ReadonlyArray<{ x: number; y: number }> };
  x: number;
  y: number;
  angle?: number;
  type?: "dynamic" | "static" | "kinematic";  // default "dynamic"
  density?: number;
  friction?: number;
  restitution?: number;
  isSensor?: boolean;                   // trigger: events fire, no physical response
  collisionCategory?: number;           // bitmask filtering
  collisionMask?: number;
  tag?: string;                         // gameplay label surfaced in collision events
}

export interface Transform2D { x: number; y: number; angle: number; }

export class Physics2DManager {
  public step(dtSeconds: number): void;

  public createBody(def: Body2DDef): BodyId;
  public removeBody(id: BodyId): void;                    // queued if called mid-callback

  public applyForce(id: BodyId, fx: number, fy: number): void;
  public applyImpulse(id: BodyId, ix: number, iy: number): void;
  public setVelocity(id: BodyId, vx: number, vy: number): void;
  public setAngularVelocity(id: BodyId, omega: number): void;
  public setKinematicTarget(id: BodyId, x: number, y: number, angle?: number): void;

  public getTransform(id: BodyId, out?: Transform2D): Readonly<Transform2D>; // interpolated; zero-alloc via out
  public getVelocity(id: BodyId, out?: { x: number; y: number }): Readonly<{ x: number; y: number }>;
  public getTag(id: BodyId): string | undefined;
  public get bodyCount(): number;

  public queryPoint(x: number, y: number): readonly BodyId[];
  public queryAABB(minX: number, minY: number, maxX: number, maxY: number): readonly BodyId[];
  public raycast(x1: number, y1: number, x2: number, y2: number): RaycastHit2D | null;

  public onCollisionStart(cb: (a: BodyId, b: BodyId, contact: ContactInfo2D) => void): Unsubscribe;
  public onCollisionEnd(cb: (a: BodyId, b: BodyId) => void): Unsubscribe;

  public destroy(): void;
}
```

**Eventing rules:**

- Collision callbacks use the framework's `Unsubscribe` subscription pattern (composable with `UnsubscribeBag`).
- Engine collision events are queued during the step and **drained after** all substeps complete — callbacks never run mid-simulation. `removeBody()` inside a callback is queued and applied post-drain.
- Transforms are **pulled** (dense data → poll), collisions are **pushed** (sparse data → events).

**Sync helper** — collapses controller `_syncView` boilerplate to registration:

```ts
// controller.initialize():
this._syncBag = new Physics2DSyncBag(this._physics!);
this._syncBag.bind(ballId, (x, y, angle) => this._view!.setBall(x, y, angle));

// controller._onUpdate(dt):
this._ops!.update(dt);
this._syncBag.sync();      // invokes each binding with the current (interpolated) transform

// controller.destroy():
this._syncBag.flush();     // bindings only; body ownership stays with ops/manager
```

Bindings whose body has been removed are auto-dropped on the next `sync()`.

**Units & coordinates** (no conversion layers — each pairing aligns natively):

| | Units | Up axis | Matches |
|---|---|---|---|
| physics2d | pixels, px/s² | y-down | Pixi/HUD space |
| physics3d | meters, m/s² (default gravity `(0, -9.82, 0)`) | y-up | Three/World space |

## 9. Packaging & build

**The constraint:** all modules currently export from the single `src/index.ts` entry with `splitting: false`. If physics joined the main entry, the CJS build would eagerly `require("matter-js")`, crashing every consumer that doesn't install it. ESM tree-shaking would mask the problem only for ESM users.

**Design:**

1. **Subpath exports** in `package.json`:
   ```json
   "exports": {
     ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js", "require": "./dist/index.cjs" },
     "./physics2d": { "types": "./dist/physics2d.d.ts", "import": "./dist/physics2d.js", "require": "./dist/physics2d.cjs" },
     "./physics3d": { "types": "./dist/physics3d.d.ts", "import": "./dist/physics3d.js", "require": "./dist/physics3d.cjs" },
     "./package.json": "./package.json"
   }
   ```
2. **tsup entries:** `{ index, physics2d, physics3d }`; add `"matter-js"`, `"cannon-es"` to `external`.
3. **Shared-code identity — non-issue (simplified after code audit):** the earlier concern that `splitting: false` would duplicate shared core classes per entry and break DI was investigated and dismissed. DI keys *that matter* are the physics manager classes themselves (`Physics2DManager` / `Physics3DManager`), and those live **only** in their own entry — never duplicated. `GamelabsApp.addModule()` does **no `instanceof` check** (pure duck-typing; verified at `GamelabsApp.ts:256` + the `configureDI`/`configureViews` iteration), so a `ModuleBinding` base-class copy bundled into the physics entry is harmless. The app's single `DIContainer` instance is passed by reference into `configureDI`, so bindings register correctly regardless of where the binding class was bundled. Therefore physics entries import core via **plain relative imports** and accept the negligible duplication of a few base helpers — no self-reference, no `tsconfig` paths mapping. Cross-entry type compatibility (`Physics2DBinding` assignable to `addModule`'s `ModuleBinding` param) holds by TypeScript's structural typing since both derive from identical source.
4. **Peer dependencies (all optional):**
   ```json
   "peerDependencies": { "matter-js": "^0.20.0", "cannon-es": "^0.20.0", "@types/matter-js": "^0.20.0" },
   "peerDependenciesMeta": {
     "matter-js": { "optional": true },
     "cannon-es": { "optional": true },
     "@types/matter-js": { "optional": true }
   }
   ```
   (Exact version ranges pinned during implementation.) Both are devDependencies for tests.
5. `llms.txt` and the docs site gain physics sections — this framework is consumed by AI code generation, so module docs must state the rules explicitly: *bodies are created by controllers/ops, never by views; views receive transforms, never read the physics world.*

## 10. Edge cases & failure modes

| Case | Handling |
|---|---|
| Tab backgrounded → giant `dt` on resume | accumulator clamp (`maxSubSteps`), excess time dropped |
| `removeBody` during collision callback | queued, applied after event drain |
| `getTransform` on removed/unknown id | returns `null`-safe sentinel? **No** — throws in dev, documented; SyncBag auto-drops stale bindings |
| Body sleeping | engine-native sleeping allowed (`allowSleep`); transforms remain readable |
| Kinematic body pushed by dynamics | engine-native kinematic semantics: infinite mass, gameplay-driven via `setKinematicTarget` |
| Two managers in one game (2D HUD minigame + 3D world) | supported; independent worlds, independent steps |
| Determinism | same machine + same input order ⇒ reproducible (fixed timestep); cross-platform not guaranteed — tests assert with tolerances |
| Manager bound but never stepped (app forgot wiring) | dev-mode warning if bodies exist and `step()` hasn't run within first frames |

## 11. Test plan (vitest, headless — no renderer)

- **Accumulator:** dt sequences → expected substep counts; clamp behavior; alpha correctness.
- **Integration sanity:** dynamic body under gravity follows ~½gt² within tolerance; restitution bounce.
- **Lifecycle:** create/remove; queryPoint/AABB/raycast hit the right bodies; tag retrieval.
- **Collisions:** start/end pairs with correct ids and contact data; sensor fires events without response; collision filtering (category/mask) suppresses pairs.
- **Reentrancy:** removeBody inside a collision callback does not corrupt the step.
- **Kinematic:** target-following position updates.
- **SyncBag:** bindings invoked with interpolated transforms; stale bindings auto-dropped; flush stops callbacks.
- **FakePhysics2D:** same public surface as `Physics2DManager`; deterministic kinematic-only stepping; collision events drivable from tests; used to prove a controller can be tested without matter-js loaded.
- All of the above mirrored for physics3d (cannon-es).
- **Build:** consuming the main entry without matter-js/cannon-es installed must succeed (script or test asserting no physics imports leak into `dist/index.*`).

## 12. Implementation plan

1. **Packaging groundwork** — subpath exports, tsup entries, externals, optional peer deps, self-reference resolution. Gate: main-entry consumers unaffected (build check in §11).
2. **physics2d** — accumulator (shared util), manager, binding, types, events, tests.
3. **physics3d** — manager, binding, types, events, tests (reuses accumulator).
4. **Sync bags + fakes** — `Physics2DSyncBag` / `Physics3DSyncBag` and `FakePhysics2D` / `FakePhysics3D` + tests.
5. **Docs** — module READMEs (gamecamera README format: binding, app wiring, controller usage), llms.txt section, CHANGELOG entry.
6. **Follow-ups (out of scope):** debug-draw overlay view (DevOverlay layer, fed via controller like any view), example game integration, cosmetic view-physics helper (option C phase 2).

Steps 2–4 are independent after step 1 and suit subagent-driven implementation.

## 13. Open questions

- matter-js latest stable is 0.19/0.20-era — pin exact supported range at implementation time.
- `raycast` in physics2d uses `Matter.Query.ray` (AABB-based, not a true segment cast) — document the precision caveat or implement a narrow-phase pass.
