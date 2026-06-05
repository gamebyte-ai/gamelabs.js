# Physics2D Module (optional)

2D rigid-body physics backed by [matter-js](https://brm.io/matter-js/). Exposes a DI-bound `Physics2DManager` that owns the authoritative body state and steps it on a fixed timestep.

Loaded from the **subpath** `@gamebyte/gamelabsjs/physics2d` — games that don't use physics never pull in matter-js. `matter-js` is an **optional peer dependency**; install it in the consuming game:

```bash
npm i matter-js
npm i -D @types/matter-js
```

## The boundary rule (read this first)

Physics produces gameplay-authoritative state, so it lives behind a manager — **not in the view**. The data flow is one-way, exactly like the rest of the framework:

```
Physics2DManager (transforms)  →  Controller (reads + decides)  →  View (renders)
```

- **Bodies are created by controllers/utilities, never by views.** A view never imports `Physics2DManager` and never reads the physics world.
- **Transforms are pulled** (the controller reads `getTransform` each frame and pushes it to the view, typically via `Physics2DSyncBag`).
- **Collisions are pushed** (the manager emits `onCollisionStart`/`onCollisionEnd` with **body ids**; the controller maps ids to gameplay and reacts).
- `matter-js` types never cross this API — controllers stay engine-agnostic.

`Physics2DManager` is dimension-2D, not renderer-specific: use it for any 2D game whether it renders in HUD (Pixi) or World space.

## Usage

### App wiring

The binding only registers the manager in DI. The app resolves it in `postInitialize` and steps it from the update loop — register it **first** so physics runs before gameplay controllers each frame, letting them read fresh transforms in the same frame.

```ts
import { GamelabsApp } from "@gamebyte/gamelabsjs";
import { Physics2DBinding, Physics2DManager } from "@gamebyte/gamelabsjs/physics2d";

class MyApp extends GamelabsApp {
  private _physics: Physics2DManager | null = null;

  protected override registerModules(): void {
    this.addModule(new Physics2DBinding({ gravity: { x: 0, y: 1 } }));
  }

  protected override postInitialize(): void {
    this._physics = this.diContainer.getInstance(Physics2DManager);
    // order 0 ensures physics steps before gameplay controllers register later.
    this.updateManager.register((dt) => this._physics!.step(dt), -1000);
  }
}
```

### Controller: create bodies, sync the view, react to collisions

```ts
import { Physics2DManager, Physics2DSyncBag } from "@gamebyte/gamelabsjs/physics2d";

export class BallViewController implements IViewController<IBallView> {
  private _physics: Physics2DManager | null = null;
  private _sync: Physics2DSyncBag | null = null;
  private readonly _subs = new UnsubscribeBag();
  private _ballId = 0;

  public inject(resolver: IInstanceResolver): void {
    this._physics = resolver.getInstance(Physics2DManager);
  }

  public initialize(view: IBallView): void {
    this._ballId = this._physics!.createBody({
      shape: { kind: "circle", radius: 16 },
      x: 100,
      y: 0,
      restitution: 0.8,
      tag: "ball",
    });

    this._sync = new Physics2DSyncBag(this._physics!);
    this._sync.bind(this._ballId, (x, y, angle) => view.setBall(x, y, angle));

    this._subs.add(
      this._physics!.onCollisionStart((a, b) => {
        if (this._physics!.getTag(a) === "ball" || this._physics!.getTag(b) === "ball") {
          view.flash();
        }
      }),
    );
  }

  // Called from the controller's own update tick (registered with UpdateManager).
  private _onUpdate(): void {
    this._sync!.sync(); // pushes the current interpolated transform to the view
  }

  public destroy(): void {
    this._subs.flush();
    this._sync?.flush();
    this._physics?.removeBody(this._ballId);
    this._physics = null;
  }
}
```

## Bodies

`createBody(def)` returns an opaque `BodyId`. Shapes: `circle`, `rect`, convex `polygon`. Types:

- `dynamic` (default) — gravity + forces + collisions.
- `static` — immovable ground/walls.
- `kinematic` — gravity-free, game-driven via `setKinematicTarget(x, y, angle?)`; pushes dynamic bodies it overlaps.

Drive dynamic bodies with `applyForce` / `applyImpulse` / `setVelocity` / `setAngularVelocity`. Sensors (`isSensor: true`) report collisions without a physical response.

## Spawning entities — `Physics2DStage` vs `Physics2DSyncBag`

Two helpers pair bodies with view objects; both keep the body in the central manager (physics never moves into the view):

- **`Physics2DSyncBag`** — you already have a `BodyId` (created elsewhere) and just want to push its transform to a view each frame. `bind(id, sink)` + `sync()`.
- **`Physics2DStage`** — "prefab" ergonomics: one `spawn(body, view)` call creates the body, pairs it with a renderer-agnostic `Physics2DEntityView` (`{ setTransform, dispose }`), and tracks the pair. The returned handle's `despawn()` removes the body and disposes the view; `sync()` pushes transforms and auto-disposes views of bodies that vanished. Use this when one place owns an entity's whole lifetime — closest to a Unity prefab + `Instantiate`/`Destroy`.

```ts
const stage = new Physics2DStage(physics);
const ball = stage.spawn(
  { shape: { kind: "circle", radius: 16 }, x: 100, y: 0, tag: "ball" },
  view.createEntity("ball", { kind: "circle", radius: 16 }), // returns { setTransform, dispose }
);
// each frame: stage.sync();
// later: ball.despawn();   // removes body + disposes graphic
```

The view's `createEntity` builds the graphic and returns the `setTransform`/`dispose` adapter — that adapter is the only thing the stage knows about rendering, so `physics2d` stays renderer-agnostic. See the `castlecrushers` example.

## Queries

`queryPoint`, `queryAABB`, and `raycast` return body ids. `raycast(x1,y1,x2,y2, filter?)` returns the nearest hit (its point lies on the ray) and accepts an optional `{ collisionMask }` that skips bodies whose `collisionCategory` is masked out (e.g. a pick ray that ignores walls). It uses matter-js's AABB-broadphase ray query — adequate for gameplay picking, approximate for thin/rotated shapes. `getVelocity`, like `getTransform`, throws for an unknown id.

## Notes & limitations

- **Gravity is in matter-js's native units, not px/s²** (default `{ x: 0, y: 1 }`, y-down). Tune with `gravityScale` (default 0.001).
- **Fixed timestep** (`fixedTimestepHz`, default 60) with a `maxSubSteps` clamp (default 5) for frame-rate independence; transforms are interpolated by default (`interpolation: true`).
- `removeBody()` is safe to call inside a collision callback (it's queued and applied after the step).
- Per-body `friction`/`restitution` are supported (matter-js combines them automatically).

## Testing without matter-js

`FakePhysics2D` is a deterministic, engine-free stand-in with the same public surface. Inject it in unit tests so controller logic runs without loading matter-js; drive collisions with `emitCollisionStart` / `emitCollisionEnd`.

```ts
const physics = new FakePhysics2D({ gravity: { x: 0, y: 100 } });
const id = physics.createBody({ shape: { kind: "circle", radius: 8 }, x: 0, y: 0 });
physics.step(1 / 60);
expect(physics.getTransform(id).y).toBeGreaterThan(0);
```
