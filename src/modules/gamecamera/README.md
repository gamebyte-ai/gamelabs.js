# GameCamera Module

Controls the 3D scene camera in Three.js. Supports multiple projection modes, object/position following, and smooth easing. The camera is not exposed — use `GameCameraManager` with `ICameraController` instances for camera behavior.

## Purpose

- Provides a `GameCameraManager` that controls the World's active camera.
- Supports orthographic and perspective projections via controller selection.
- Follow target or position with optional easing for smooth movement.
- Can be activated/deactivated; when deactivated, `update()` does nothing.

## Usage

### Basic setup

```ts
import { GamelabsApp, GameCameraManager, Front2dCameraController } from "gamelabsjs";

class MyApp extends GamelabsApp {
  private readonly _cameraManager = new GameCameraManager();

  protected override postInitialize(): void {
    if (this.world) {
      this._cameraManager.initialize(this.world);
      new Front2dCameraController(this._cameraManager);
    }
  }

  protected override onResize(width: number, height: number, dpr: number): void {
    super.onResize(width, height, dpr);
    this._cameraManager.resize(width, height);
  }

  protected override onStep(dtSeconds: number): void {
    super.onStep(dtSeconds);
    this._cameraManager.update(dtSeconds);
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
import { Topdown2dCameraController } from "gamelabsjs";
new Topdown2dCameraController(this._cameraManager);  // constructor calls setController
```

### Orthographic size (ortho modes)

```ts
this._cameraManager.setOrthoSize(20);
```

### Activate / deactivate

```ts
this._cameraManager.deactivate();  // update() does nothing
this._cameraManager.activate();   // update() runs again
```

## Camera modes

| Mode           | Projection  | Direction                                |
|----------------|-------------|------------------------------------------|
| `front2d`      | Orthographic| Facing -z                                |
| `front3d`      | Perspective | Facing -z                                |
| `topdown2d`    | Orthographic| Facing -y                                |
| `topdown3d`    | Perspective | Facing -y                                |
| `isometric2d`  | Orthographic| From (a,a,a) toward (0,0,0)              |
| `isometric3d`  | Perspective | From (a,a,a) toward (0,0,0)              |
| `orbital3d`    | Perspective | Spherical orbit around focus             |
| `custom`       | —           | User-defined via `BaseCustomCameraController` |

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
- `ICameraController` — Interface for camera controllers (`isOrtho`, `getMode`, `applyPositionToCamera`, `getFocusFromOrthoPosition`).
- `GameCameraMode` — Mode enum (used by controllers; the manager does not use it).
- `GameCameraBinding` — Module binding.
- `BaseCameraController` — Root base for all camera controllers.
- `FrontBaseCameraController`, `Front2dCameraController`, `Front3dCameraController` — Front camera controllers.
- `TopdownBaseCameraController`, `Topdown2dCameraController`, `Topdown3dCameraController` — Topdown camera controllers.
- `IsometricBaseCameraController`, `Isometric2dCameraController`, `Isometric3dCameraController` — Isometric camera controllers.
- `Orbital3dCameraController` — Orbital 3D camera with spherical controls.
- `BaseCustomCameraController` — Abstract base for custom camera implementations.
