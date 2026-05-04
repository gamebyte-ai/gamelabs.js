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

### Follow an object

```ts
this._cameraManager.followObject(playerMesh, 8);
```

### Follow a position

```ts
this._cameraManager.followPosition(x, y, z, 8);
```

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

### Example: screen shake driver

```ts
import * as THREE from "three";
import { GameCameraManager, UpdateManager } from "@gamebyte/gamelabsjs";

const SHAKE_ID = "shake";

export class CameraShakeDriver {
  private _camera: GameCameraManager;
  private _amplitude = 0;
  private _durationMs = 0;
  private _remainingMs = 0;
  private _vec = new THREE.Vector3();

  public constructor(camera: GameCameraManager, updateManager: UpdateManager) {
    this._camera = camera;
    updateManager.register((dt) => this._tick(dt));
  }

  public shake(amplitude: number, durationMs: number): void {
    if (this._remainingMs > 0 && amplitude < this._amplitude) return;
    this._amplitude = amplitude;
    this._durationMs = durationMs;
    this._remainingMs = durationMs;
  }

  private _tick(dt: number): void {
    if (this._remainingMs <= 0) return;
    this._remainingMs -= dt * 1000;
    if (this._remainingMs <= 0) {
      this._camera.clearOffset(SHAKE_ID);
      return;
    }
    const a = this._amplitude * (this._remainingMs / this._durationMs);
    this._vec.set((Math.random() * 2 - 1) * a, (Math.random() * 2 - 1) * a, 0);
    this._camera.setOffset(SHAKE_ID, { localPosition: this._vec });
  }
}
```

The same shape works for recoil (`localPosition` back + `rotation` pitch up), look-ahead (`focus` driven by target velocity), zoom punch (`fov` blip), or any combination — different ids on different drivers, no coordination needed.

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
- `ICameraController` — Interface for camera controllers (`isOrtho`, `getMode`, `applyPositionToCamera`, `getFocusFromOrthoPosition`).
- `GameCameraMode` — Mode enum (used by controllers; the manager does not use it).
- `GameCameraBinding` — Module binding.
- `BaseCameraController` — Root base for all camera controllers.
- `FrontBaseCameraController`, `Front2dCameraController`, `Front3dCameraController` — Front camera controllers.
- `TopdownBaseCameraController`, `Topdown2dCameraController`, `Topdown3dCameraController` — Topdown camera controllers.
- `IsometricBaseCameraController`, `Isometric2dCameraController`, `Isometric3dCameraController` — Isometric camera controllers.
- `Orbital3dCameraController` — Orbital 3D camera with spherical controls.
- `BaseCustomCameraController` — Abstract base for custom camera implementations.
