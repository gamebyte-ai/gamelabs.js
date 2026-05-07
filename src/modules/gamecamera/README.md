# GameCamera Module

Controls the 3D scene camera in Three.js. Supports multiple projection modes, object/position following, and smooth easing. The camera is not exposed — use `GameCameraManager` with `ICameraController` instances for camera behavior.

## Purpose

- Provides a `GameCameraManager` that controls the World's active camera.
- Supports orthographic and perspective projections via controller selection.
- Follow target or position with optional easing for smooth movement.
- Named-channel camera offsets so user code can layer effects (shake, recoil, look-ahead, zoom punch, …) without subclassing the manager.
- Can be activated/deactivated; when deactivated, `update()` does nothing.

## Usage

### Basic setup

The binding registers `GameCameraManager` in the DI container. The app
resolves it in `postInitialize` and forwards the runtime events
(`initialize`, `resize`, `update`) from its own lifecycle hooks — the
module itself is boot-only and does not auto-wire these.

```ts
import { GamelabsApp, GameCameraBinding, GameCameraManager, Front2dCameraController } from "@gamebyte/gamelabsjs";

class MyApp extends GamelabsApp {
  private readonly _cameraBinding = new GameCameraBinding();
  private _cameraManager: GameCameraManager | null = null;

  protected override registerModules(): void {
    this.addModule(this._cameraBinding);
  }

  protected override postInitialize(): void {
    if (!this.world) throw new Error("world not initialized");
    this._cameraManager = this.diContainer.getInstance(GameCameraManager);
    this._cameraManager.initialize(this.world);
    new Front2dCameraController(this._cameraManager).register();
  }

  protected override onResize(width: number, height: number, dpr: number): void {
    super.onResize(width, height, dpr);
    this._cameraManager?.resize(width, height);
  }

  protected override onStep(dtSeconds: number): void {
    super.onStep(dtSeconds);
    this._cameraManager?.update(dtSeconds);
  }
}
```

### Follow an object (convenience)

```ts
this._cameraManager.followObject(playerMesh, 8);
```

Wraps `setFollow(new FollowObject(playerMesh, 8))` and snaps the focal point to the object on first call. See [Camera follow](#camera-follow) for the pluggable strategy pattern.

### Follow a position (convenience)

```ts
this._cameraManager.followPosition(x, y, z, 8);
```

Wraps `setFollow(new FollowPosition(x, y, z, 8))` and snaps the focal point. See [Camera follow](#camera-follow).

### Set static position

```ts
this._cameraManager.setPosition(0, 5, 0);
```

### Change controller

```ts
import { Topdown2dCameraController } from "@gamebyte/gamelabsjs";
new Topdown2dCameraController(this._cameraManager).register();
```

### Orthographic size (ortho modes)

```ts
this._cameraManager.setOrthoSize(20);
```

### Activate / deactivate

```ts
this._cameraManager.deactivate(); // update() does nothing
this._cameraManager.activate(); // update() runs again
```

### Base FOV (perspective)

```ts
this._cameraManager.setBaseFov(70);
```

The base FOV is what `fov` offsets are layered on top of. Default is `60`.

## Camera follow

The manager keeps a single follow strategy — a pluggable rule for how the focal point moves toward a target each frame. Same external/composable shape as `ICameraConstraint`: register one with `setFollow`, remove with `setFollow(null)`. The strategy runs once per `update(dt)` call, before constraints and offsets, so its output is what `applyToFocus` constraints see.

### `ICameraFollow`

```ts
interface ICameraFollow {
  step(current: THREE.Vector3, dtSeconds: number): void;
}
```

The strategy mutates `current` in place. It owns its own state — target reference, easing constants, spring velocity, anything else.

### API

```ts
manager.setFollow(follow: ICameraFollow | null): void;
manager.getFollow(): ICameraFollow | null;
```

`setFollow` does **not** snap the focal point; the strategy lerps from wherever the camera currently is. The legacy `followObject` / `followPosition` convenience methods do snap (matching their previous behavior) — use them when you want an immediate jump on first call, `setFollow` when you want a smooth handoff.

### Built-ins

- `FollowObject(object, easing?)` — lerp toward a `THREE.Object3D`'s world position with exponential easing. Default easing 8.
- `FollowPosition(x, y, z, easing?)` — lerp toward a fixed point. `setTarget(x, y, z)` updates the destination without resetting the easing.
- `PathFollow(waypoints, duration)` — linearly interpolate the focal point through a list of waypoints over a fixed duration with equal time per segment. Holds at the last waypoint when elapsed reaches `duration`. See `CinematicPathTrack` for a time-bounded wrapper that auto-restores the previous follow.

### Custom strategies

Spring damping for racing / vehicle:

```ts
import * as THREE from "three";
import { ICameraFollow } from "@gamebyte/gamelabsjs";

class SpringFollow implements ICameraFollow {
  private readonly _vel = new THREE.Vector3();
  private readonly _delta = new THREE.Vector3();

  public constructor(
    private readonly _target: THREE.Object3D,
    private readonly _stiffness: number, // e.g. 50
    private readonly _damping: number, // e.g. 8
  ) {}

  public step(current: THREE.Vector3, dt: number): void {
    this._target.getWorldPosition(this._delta).sub(current);
    this._vel.addScaledVector(this._delta, this._stiffness * dt);
    this._vel.multiplyScalar(Math.exp(-this._damping * dt));
    current.addScaledVector(this._vel, dt);
  }
}

manager.setFollow(new SpringFollow(carMesh, 50, 8));
```

Group framing for co-op / fighting games (centroid + auto-zoom — the centroid goes via `step`; the zoom rides on the `orthoSize` offset channel):

```ts
class GroupCentroidFollow implements ICameraFollow {
  public constructor(private readonly _targets: THREE.Object3D[]) {}
  public step(current: THREE.Vector3, dt: number): void {
    const tmp = new THREE.Vector3();
    const sum = new THREE.Vector3();
    for (const t of this._targets) sum.add(t.getWorldPosition(tmp));
    sum.divideScalar(this._targets.length);
    const k = 1 - Math.exp(-6 * dt);
    current.lerp(sum, k);
  }
}
```

(For full group framing, pair this with a per-frame driver that writes an `orthoSize` offset based on the target spread.)

### Notes

- **One strategy at a time.** Unlike offsets and constraints, the manager holds a single follow. Switching is `setFollow(other)` (smooth) or `manager.setPosition(x,y,z)` then `setFollow(other)` (snap, since `setPosition` clears follow).
- **`setPosition` and `stopFollow` clear the strategy.** Calling `manager.setPosition(...)` or `stopFollow()` sets `_follow` to `null`; the camera holds wherever you put it until you set a new follow.
- **Strategies own their target.** If you change the followed object, swap in a new strategy — `FollowObject` keeps its target reference for life. (`FollowPosition` does have a `setTarget` mutator since the common case there is moving the destination.)

## Camera offsets

The manager exposes a small set of named-channel offsets so you can layer
effects (shake, recoil, breathing, look-ahead, over-shoulder framing,
zoom punch, dutch angle, …) on top of whatever the active controller
produces — without subclassing the manager or the controller.

### `CameraOffset`

```ts
type CameraOffset = {
  focus?: THREE.Vector3; // pre-controller: shifts the focal point (look-ahead, target offset)
  localPosition?: THREE.Vector3; // post-controller: in camera-local space (shake, recoil, lean)
  worldPosition?: THREE.Vector3; // post-controller: in world space
  rotation?: THREE.Euler; // post-controller: small additive delta (kick, dutch)
  fov?: number; // perspective FOV delta (zoom punch)
  orthoSize?: number; // ortho size delta
};
```

### API

```ts
manager.setOffset(id: string, offset: CameraOffset): void;
manager.clearOffset(id: string): void;
manager.clearAllOffsets(): void;
manager.getOffset(id: string): CameraOffset | null;
```

Per frame, the manager:

1. Sums all offsets across registered channels.
2. Biases the focal point by `focus` and lets the controller place the camera.
3. Applies projection deltas (`fov` / `orthoSize`) on top of the manager's base values.
4. Translates the camera by `worldPosition`, then by `localPosition` in camera-local space.
5. Adds `rotation` to the camera's Euler rotation.

`setOffset` overwrites a channel by id — multiple effects coexist as long as they use distinct ids.

### Notes & limits

- **Effects are userland.** The manager just composes the values you write each frame. Any decay, oscillation, or time curve lives in your own driver code; call `clearOffset(id)` (or `clearAllOffsets()`) when an effect is done.
- **Rotation is small-angle additive.** Eulers are summed; this is fine for shake / recoil / dutch but not for cinematic rotations — those belong in a controller.
- **Vectors are stored by reference.** If you keep mutating the same `Vector3` between frames and call `setOffset` again, the manager picks up the new values. Don't share a single `Vector3` across multiple channel ids.
- **No TTL / auto-clear.** A forgotten offset persists forever — drivers own the lifecycle.

### Other effects (build your own)

The same offset shape works for recoil (`localPosition` back + `rotation` pitch up), look-ahead (`focus` driven by target velocity), or any combination — different ids on different drivers, no coordination needed. For time-bounded effects, model them as `Track` subclasses on the timeline; for continuously-driven effects (e.g. look-ahead from velocity), update the offset each frame from your own controller.

## Built-in tracks

This module ships several `Track` subclasses (from the `timeline` module) for common time-bounded camera effects. All require the timeline binding and the standard onStep ordering — tick the timeline before the camera so the track's offset writes land the same frame. See `src/modules/timeline/README.md` for the setup.

Each track owns a unique offset slot keyed by its `uniqueId`, so concurrent instances stack additively (two shakes from rapid hits, two zoom-punches, etc.).

### `CameraShakeTrack`

Randomized `localPosition` offset that decays linearly to 0 over its duration. Used for impact / death / explosion shake.

```ts
import { CameraShakeTrack } from "@gamebyte/gamelabsjs";
timeline.add(new CameraShakeTrack(camera, { amplitude: 22, duration: 0.45 }));
```

### `ZoomPunchTrack`

Momentary FOV / orthoSize pulse with a `sin(π·progress)` curve — rises from 0 to peak at the midpoint, then falls back. Used for hit / cast / pickup feedback.

```ts
import { ZoomPunchTrack } from "@gamebyte/gamelabsjs";
// Perspective camera — peak 6° narrower for a quick zoom-in pulse
timeline.add(new ZoomPunchTrack(camera, { fovDelta: -6, duration: 0.18 }));
// Ortho camera — peak 1.5 units smaller frustum
timeline.add(new ZoomPunchTrack(camera, { orthoSizeDelta: -1.5, duration: 0.18 }));
```

Pass `fovDelta`, `orthoSizeDelta`, or both. Only the active projection's offset is read by the manager, so apps that switch projections at runtime can pass both safely.

### `DollyZoomTrack`

The Hitchcock "Vertigo" effect: changes FOV while dollying the camera along its forward axis so the subject stays the same size on screen — foreground locked, background size shifts dramatically.

```ts
import { DollyZoomTrack } from "@gamebyte/gamelabsjs";
timeline.add(
  new DollyZoomTrack(camera, {
    target: bossMesh,
    fovDelta: 25, // wider FOV at peak (background grows)
    duration: 1.2,
    curve: (t) => Math.sin(t * Math.PI), // rise-and-return; default is linear
  }),
);
```

Perspective cameras only — silently no-ops on ortho. Reads the camera's FOV and world position at `onStart` to lock in the `D · tan(F/2)` invariant.

### `HitStopTrack`

Freezes the active follow strategy for a brief window (default 100 ms) and optionally writes a sin-curve FOV / orthoSize pulse for emphasis. Restores the previous follow on end or cancel.

```ts
import { HitStopTrack } from "@gamebyte/gamelabsjs";
timeline.add(new HitStopTrack(camera, { duration: 0.12, fovDelta: -3 }));
```

Only freezes the **camera** follow — game-time scaling (the other half of canonical hit-stop) is a global concern and lives in your game's update loop.

### `CinematicPathTrack`

Time-bounded cutscene primitive: saves whatever follow strategy is currently active, installs a `PathFollow` for the duration, then restores the original strategy on natural end or cancel.

```ts
import * as THREE from "three";
import { CinematicPathTrack } from "@gamebyte/gamelabsjs";
timeline.add(
  new CinematicPathTrack(camera, {
    duration: 4,
    waypoints: [new THREE.Vector3(0, 0, 0), new THREE.Vector3(20, 5, 0), new THREE.Vector3(20, 5, -30)],
  }),
);
```

For a permanent rail camera (no save/restore), install a `PathFollow` directly with `manager.setFollow(new PathFollow(waypoints, duration))`.

## Camera constraints

Where offsets are _additive_ per-frame contributions, **constraints** are _post-processors_ that adjust the camera's pose before it's written to THREE. Use them for movement restrictions: level bounds, dead-zone follow, camera-collision pull-in, snap-to-volume.

### `ICameraConstraint`

```ts
interface ICameraConstraint {
  applyToFocus?(focus: THREE.Vector3): void;
  applyToCamera?(position: THREE.Vector3, rotation: THREE.Euler): void;
}
```

Two hooks, both optional:

- `applyToFocus` runs after offset summation and **before** the active controller projects from the focal point. Use it to alter WHERE the camera looks (dead-zone, look-ahead bias, snap-to-volume).
- `applyToCamera` runs after the controller and after world / local / rotation offsets have been applied. Use it to clamp the camera's final pose (level bounds, collision pull-in).

Implementations mutate the inputs **in-place** — these methods run every frame.

### API

```ts
manager.setConstraint(id: string, constraint: ICameraConstraint): void;
manager.clearConstraint(id: string): void;
manager.clearAllConstraints(): void;
manager.getConstraint(id: string): ICameraConstraint | null;
```

### Per-frame pipeline

```
follow.step(currentPosition, dt)            // ← FOLLOW (strategy)
  → sum offsets
  → biasedFocus = currentPosition + focusBias
  → applyToFocus hooks (in registration order)
  → controller projects camera from biasedFocus
  → apply worldPosition / localPosition / rotation offsets
  → applyToCamera hooks (in registration order)
  → final pose written to THREE camera
```

Insertion order matters when constraints overlap (Map iteration is JS insertion order). A `SnapToVolume` should sit before a `Bounds` so the snap can't be clobbered by the clamp.

### Built-in: `BoundsConstraint`

Clamps the camera's final position to an axis-aligned bounding box.

```ts
import * as THREE from "three";
import { BoundsConstraint } from "@gamebyte/gamelabsjs";

const bounds = new BoundsConstraint({
  min: new THREE.Vector3(-50, 0, -50),
  max: new THREE.Vector3(50, 100, 50),
});
manager.setConstraint("level-bounds", bounds);

// later, when entering a smaller arena:
bounds.setMin(new THREE.Vector3(-20, 0, -20));
bounds.setMax(new THREE.Vector3(20, 100, 20));
manager.setConstraint("level-bounds", bounds); // re-trigger apply
```

### Built-in: `DeadZoneFocusConstraint`

Keeps the focal point still while the requested focus stays inside an axis-aligned window on the chosen plane. Once the requested focus exits the window, the focal point snaps so the requested focus is back on the window edge — the manager's follow easing then smooths the transition.

```ts
import { DeadZoneFocusConstraint } from "@gamebyte/gamelabsjs";

manager.setConstraint(
  "dead-zone",
  new DeadZoneFocusConstraint({
    plane: "xz", // topdown camera convention; "xy" for front2d, "yz" for side-on
    halfWidth: 3,
    halfHeight: 2,
  }),
);
```

The off-plane axis (Y for `"xz"`) follows freely — vertical motion isn't windowed.

### Notes & limits

- **Constraints don't stop tracks.** A constraint can clamp a shake into a wall, but it can't cancel the shake — that's still the timeline's job.
- **In-place mutation only.** Returning new vectors from a hook would allocate every frame; the contract is mutate-and-go.
- **No automatic re-apply on external mutation.** If you grab a `BoundsConstraint`'s `min` reference and modify it directly, the change takes effect on the next manager `update` / offset-write but not synchronously. Re-call `setConstraint(id, instance)` if you need it to land immediately.

## Camera modes

| Mode          | Projection   | Direction                                     |
| ------------- | ------------ | --------------------------------------------- |
| `front2d`     | Orthographic | Facing -z                                     |
| `front3d`     | Perspective  | Facing -z                                     |
| `topdown2d`   | Orthographic | Facing -y                                     |
| `topdown3d`   | Perspective  | Facing -y                                     |
| `isometric2d` | Orthographic | From (a,a,a) toward (0,0,0)                   |
| `isometric3d` | Perspective  | From (a,a,a) toward (0,0,0)                   |
| `orbital3d`   | Perspective  | Spherical orbit around focus                  |
| `custom`      | —            | User-defined via `BaseCustomCameraController` |

## Camera controllers

Mode-specific controllers wrap `GameCameraManager` and expose restricted APIs:

- **`BaseCameraController`** (abstract) — Root base: `followObject`, `followPosition`, `stopFollow`, `activate`, `deactivate`.
- **Front** — `FrontBaseCameraController` (extends Base), `Front2dCameraController`, `Front3dCameraController`
  - Front2d: `move(x, y)` — XY plane (z via `setDefaultZ`). Front3d: `move(x, y, z)` — full 3D.
- **Topdown** — `TopdownBaseCameraController` (extends Base), `Topdown2dCameraController`, `Topdown3dCameraController`
  - Topdown2d: `move(x, z)` — XZ ground plane (y via `setDefaultY`). Topdown3d: `move(x, y, z)` — full 3D.
- **Isometric** — `IsometricBaseCameraController` (extends Base), `Isometric2dCameraController`, `Isometric3dCameraController`
  - Isometric2d: `move(x, z)` — XZ ground plane (y via `setDefaultY`). Isometric3d: `move(x, y, z)` — full 3D.
- **Orbital** — `Orbital3dCameraController` — Spherical orbit around focus. Props: `distance`, `azimuth`, `pitch`, `minDistance`, `maxDistance`, `minPitch`, `maxPitch`. Methods: `addAzimuth`, `addPitch`, `addDistance`, `move(x,y,z)`.
- **Custom** — `BaseCustomCameraController` — Extend and override `applyPositionToCamera` and `getFocusFromOrthoPosition` for user implementations.

## Exports

- `GameCameraManager` — Main camera controller. Use `setController(controller)` to set the active controller.
- `CameraOffset` — Type for the named-channel offset system (`focus`, `localPosition`, `worldPosition`, `rotation`, `fov`, `orthoSize`).
- `CameraShakeTrack`, `CameraShakeTrackOptions` — Randomized `localPosition` offset that decays linearly to 0.
- `ZoomPunchTrack`, `ZoomPunchTrackOptions` — Sin-curve FOV / orthoSize pulse for impact feedback.
- `DollyZoomTrack`, `DollyZoomTrackOptions` — Hitchcock Vertigo effect; coordinated FOV change + dolly to lock subject screen-size.
- `HitStopTrack`, `HitStopTrackOptions` — Brief follow-freeze with optional zoom pulse; restores prior follow on end/cancel.
- `CinematicPathTrack`, `CinematicPathTrackOptions` — Time-bounded path-following cutscene; saves and restores the prior follow.
- `ICameraFollow` — Pluggable follow-strategy interface. Single `step(current, dt)` method; mutate the focal point in place.
- `FollowObject` — Built-in: exponential lerp toward a `THREE.Object3D`'s world position.
- `FollowPosition` — Built-in: exponential lerp toward a fixed point. `setTarget(x, y, z)` updates the destination.
- `PathFollow` — Built-in: linear interpolation through waypoints over a fixed duration. Used by `CinematicPathTrack` and as a permanent rail-cam strategy.
- `ICameraConstraint` — Pluggable post-processor interface. Optional `applyToFocus` (pre-controller) and `applyToCamera` (post-transform) hooks.
- `BoundsConstraint`, `BoundsConstraintOptions` — Clamps camera position to an AABB.
- `DeadZoneFocusConstraint`, `DeadZoneFocusConstraintOptions`, `DeadZonePlane` — Holds focus still while the requested focus stays inside a window on a chosen plane.
- `ICameraController` — Interface for camera controllers (`isOrtho`, `getMode`, `applyPositionToCamera`, `getFocusFromOrthoPosition`).
- `GameCameraMode` — Mode enum (used by controllers; the manager does not use it).
- `GameCameraBinding` — Module binding.
- `BaseCameraController` — Root base for all camera controllers.
- `FrontBaseCameraController`, `Front2dCameraController`, `Front3dCameraController` — Front camera controllers.
- `TopdownBaseCameraController`, `Topdown2dCameraController`, `Topdown3dCameraController` — Topdown camera controllers.
- `IsometricBaseCameraController`, `Isometric2dCameraController`, `Isometric3dCameraController` — Isometric camera controllers.
- `Orbital3dCameraController` — Orbital 3D camera with spherical controls.
- `BaseCustomCameraController` — Abstract base for custom camera implementations.
