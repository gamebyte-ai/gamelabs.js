# GameCamera Module

Controls the 3D scene camera in Three.js. Supports multiple projection modes, object/position following, and smooth easing. The camera is not exposed — use `GameCameraManager` methods for mode selection and movement.

## Purpose

- Provides a `GameCameraManager` that controls the World's active camera.
- Supports orthographic and perspective projections via mode selection.
- Follow target or position with optional easing for smooth movement.
- Can be activated/deactivated; when deactivated, `update()` does nothing.

## Usage

### Basic setup

```ts
import { GamelabsApp, GameCameraManager, GameCameraModes } from "gamelabsjs";

class MyApp extends GamelabsApp {
  private readonly _cameraManager = new GameCameraManager();

  protected override postInitialize(): void {
    if (this.world) {
      this._cameraManager.initialize({ world: this.world });
      this._cameraManager.setMode(GameCameraModes.platformer2d);
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
this._cameraManager.followObject(playerMesh, { easing: 8 });
```

### Follow a position

```ts
this._cameraManager.followPosition(x, y, z, { easing: 8 });
```

### Set static position

```ts
this._cameraManager.setPosition(0, 5, 0);
```

### Change mode

```ts
this._cameraManager.setMode(GameCameraModes.topdown2d);
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
| `platformer2d` | Orthographic| Facing -z                                |
| `topdown2d`    | Orthographic| Facing -y                                |
| `isometric2d`  | Orthographic| From (a,a,a) toward (0,0,0)              |
| `isometric3d`  | Perspective | From (a,a,a) toward (0,0,0)              |

## Exports

- `GameCameraManager` — Main camera controller.
- `GameCameraMode` — Mode type.
- `GameCameraModes` — Mode constants.
- `GameCameraManagerInitializeParams` — Params for `initialize()`.
- `GameCameraFollowOptions` — Options for `followObject()` / `followPosition()`.
