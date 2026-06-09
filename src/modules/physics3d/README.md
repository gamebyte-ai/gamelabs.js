# Physics3D Module (optional)

3D rigid-body physics backed by [cannon-es](https://pmndrs.github.io/cannon-es/). Exposes a DI-bound `Physics3DManager` that owns the authoritative body state and steps it on a fixed timestep.

Loaded from the **subpath** `@gamebyte/gamelabsjs/physics3d` — games that don't use physics never pull in cannon-es. `cannon-es` is an **optional peer dependency** (it ships its own types):

```bash
npm i cannon-es
```

## The boundary rule (read this first)

Same one-way flow as the rest of the framework — physics is a state producer behind a manager, never in the view:

```
Physics3DManager (transforms)  →  Controller (reads + decides)  →  View (renders Three.js meshes)
```

- **Bodies are created by controllers/utilities, never by views.** A view never imports `Physics3DManager`.
- **Transforms are pulled** each frame (`Physics3DSyncBag` pushes position + quaternion onto the mesh).
- **Collisions are pushed** as events carrying **body ids**; the controller maps ids to gameplay.
- `cannon-es` types never cross this API.

Use `physics3d` for 3D games — including a 3D game with a Pixi HUD. The axis is dimension, not renderer.

## Usage

### App wiring

```ts
import { GamelabsApp } from "@gamebyte/gamelabsjs";
import { Physics3DBinding, Physics3DManager } from "@gamebyte/gamelabsjs/physics3d";

class MyApp extends GamelabsApp {
  private _physics: Physics3DManager | null = null;

  protected override registerModules(): void {
    this.addModule(new Physics3DBinding({ gravity: { x: 0, y: -9.82, z: 0 } }));
  }

  protected override postInitialize(): void {
    this._physics = this.diContainer.getInstance(Physics3DManager);
    this.updateManager.register((dt) => this._physics!.step(dt), -1000); // step before gameplay
  }
}
```

### Controller: body + view sync (position & rotation)

```ts
import { Physics3DManager, Physics3DSyncBag } from "@gamebyte/gamelabsjs/physics3d";

const physics = resolver.getInstance(Physics3DManager);

const groundId = physics.createBody({
  shape: { kind: "box", width: 50, height: 1, depth: 50 },
  x: 0,
  y: -0.5,
  z: 0,
  type: "static",
});

const crateId = physics.createBody({
  shape: { kind: "box", width: 1, height: 1, depth: 1 },
  x: 0,
  y: 8,
  z: 0,
  restitution: 0.3,
  tag: "crate",
});

const sync = new Physics3DSyncBag(physics);
sync.bind(crateId, (t) => {
  crateMesh.position.set(t.x, t.y, t.z);
  crateMesh.quaternion.set(t.qx, t.qy, t.qz, t.qw);
});
// call sync.sync() each frame from the controller's update tick
```

## Bodies

`createBody(def)` returns a `BodyId`. Shapes: `sphere`, `box` (full extents), `plane` (infinite ground, faces +Z locally — rotate the body to orient). Types:

- `dynamic` (default) — mass (default 1), gravity, forces, collisions.
- `static` — immovable.
- `kinematic` — gravity-free; positioned via `setKinematicTarget(x, y, z)`; pushes dynamics.

Drive dynamics with `applyForce` / `applyImpulse` / `setVelocity` / `setAngularVelocity` (all wake a sleeping body). Sensors (`isSensor: true`) report collisions without a response. `raycast(x1,y1,z1, x2,y2,z2, filter?)` returns the nearest hit body id + point; pass `filter.collisionMask` (matched against each body's `collisionGroup`) to shoot a ray that passes through some bodies — e.g. a pick ray that ignores walls and only hits gameplay bodies (see `factorymatch`). `queryPoint(x,y,z)` / `queryAABB(min…,max…)` return body ids by bounding box. `getVelocity`, like `getTransform`, throws for an unknown id.

## Spawning entities — `Physics3DStage` vs `Physics3DSyncBag`

Same split as 2D. **`Physics3DSyncBag`** binds transforms for bodies created elsewhere. **`Physics3DStage`** is the prefab layer: `spawn(body, view)` creates the body, pairs it with a `Physics3DEntityView` (`{ setTransform(t), dispose }`, where `t` carries position + quaternion), and returns a handle; `despawn()` removes both, `sync()` pushes transforms and disposes vanished bodies' views. The body stays in the central world; only the body↔mesh pairing is encapsulated.

```ts
const stage = new Physics3DStage(physics);
const crate = stage.spawn(
  { shape: { kind: "box", width: 1, height: 1, depth: 1 }, x: 0, y: 8, z: 0 },
  {
    setTransform: (t) => {
      crateMesh.position.set(t.x, t.y, t.z);
      crateMesh.quaternion.set(t.qx, t.qy, t.qz, t.qw);
    },
    dispose: () => crateMesh.removeFromParent(),
  },
);
// each frame: stage.sync();  // later: crate.despawn();
```

## Notes & limitations

- **Gravity is real m/s²** (default `{ x: 0, y: -9.82, z: 0 }`, y-up to match Three world space).
- **Fixed timestep** (default 60 Hz) with `maxSubSteps` clamp; transforms interpolate position (lerp) and orientation (nlerp) by default.
- **Friction / restitution** are applied against a shared _world material_ — so a body's `friction`/`restitution` govern its contacts with the ground and other default-material bodies. Two bodies that _both_ set custom materials fall back to the world default contact for their pair. Tune the baseline with `defaultFriction` / `defaultRestitution`. (Full per-pair materials are a possible follow-up.)
- **Contact point/normal** reported with `onCollisionStart` are approximate in v1 (derived from body centers).
- `removeBody()` inside a collision callback is safe (queued, applied after the step).

## Testing without cannon-es

`FakePhysics3D` is a deterministic, engine-free stand-in with the same public surface (gravity + velocity integration, no collision detection). Drive collisions with `emitCollisionStart` / `emitCollisionEnd`.
