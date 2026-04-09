# Gamelabs.js

A TypeScript skeleton + reusable modules for web games. Designed for:
- **AI-generated** game projects
- Consistent project structure for easy review, shared module development and usage
- Strict separation between **rendering/scene** and **game logic**

This is **not** a full engine. It intentionally exposes Three/Pixi directly and provides a small set of opinionated primitives for program flow and wiring.

## Dependencies

- **Three.js** for 3D (world / scene)
- **PixiJS** for 2D (HUD / UI)
- **GSAP** for animations

Peer dependencies: `three`, `pixi.js`, `@pixi/layout`, `@pixi/ui`

## Architecture

- **GamelabsApp** — base app class; extend it and override lifecycle methods
- **Two DI containers** — `diContainer` for controllers/utilities/events, `viewDiContainer` for views
- **View/Controller separation** — views render and handle input; controllers own behavior and state
- **Two view layers** — World views (Three.js) and Hud views (PixiJS)
- **Modules** — reusable feature bundles with DI, views, and assets

## Quick start

```ts
import { GamelabsApp } from "@gamebyte/gamelabsjs";

class MyApp extends GamelabsApp {
  constructor(stageEl: HTMLElement) {
    super({ mount: stageEl, sharedContext: true });
  }
}

const app = new MyApp(document.getElementById("stage")!);
await app.initialize();
app.mainLoop();
```

## App lifecycle

Your `MyGameApp` extends `GamelabsApp` and overrides these methods (called in this order):

| Method | Purpose |
|--------|---------|
| `registerModules()` | Register `ModuleBinding` instances via `addModule()` |
| `configureDI()` | Bind instances and singletons to DI containers |
| `configureViews()` | Register view/controller pairs via `viewFactory.register()` |
| `loadAssets()` | Enqueue app-specific assets in `assetManager` |
| `postInitialize()` | Create screens/views, subscribe to events (assets are loaded) |
| `onStep(dt)` | Per-frame logic hook |
| `preDestroy()` | Cleanup owned resources |

## Project structure

```
MyGame/src
├── controllers/       FooController.ts
├── events/            FooEvents.ts
├── models/            FooModel.ts
├── utilities/         FooService.ts
├── views/             IFooView.ts, FooView.pixi.ts, FooView.three.ts
├── MyGameApp.ts
├── MyGameAssetIds.ts
└── MyGameConfig.ts
```

### File naming conventions

- Interfaces: `IFoo.ts` (prefix with `I`)
- HUD views: `FooView.pixi.ts` (suffix `.pixi.ts`)
- World views: `FooView.three.ts` (suffix `.three.ts`)
- Controllers: `FooController.ts`
- Events: `FooEvents.ts`
- Asset IDs: `MyGameAssetIds.ts` (enum with namespaced values: `"MyGame.ItemName"`)

## Repository layout

```
src/
├── core/          App lifecycle, DI, views/controllers, world, hud, screens, assets, input, audio
├── modules/       Reusable feature modules
│   ├── uicomponents/         Button, Background, Image, layout components
│   ├── gamecamera/           Camera controllers (topdown, front, isometric, orbital)
│   ├── gamegrid/             Grid system with models, views, cell/item objects
│   ├── mainscreen/           Main menu screen with play/settings buttons
│   ├── levelprogressscreen/  Level selection screen with progress
│   ├── onscreencontrols/     Virtual buttons and joysticks for touch input
│   ├── settings/             Settings manager with persistence and popup UI
│   └── audiodsp/             DSP effects chain (filter, reverb, delay, distortion)
└── index.ts       Barrel exports
```

## Examples

| Example | Description |
|---------|-------------|
| `helloworld` | 3D cube with orbital camera and HUD controls |
| `screens` | Screen navigation using built-in modules |
| `tictactoe` | TicTacToe with gamegrid module, win detection |
| `match3` | Match-3 puzzle with animated gem board |
| `avoidance` | Survival game with keyboard + on-screen joystick input |
| `watersort` | Puzzle game with tween pour animations |

```bash
npm run build                    # Build library first
cd examples/<name> && npm i && npm run dev
```

## Commands

```bash
npm run build       # Build library (tsup)
npm run typecheck   # Type check (tsc --noEmit)
npm run dev         # Watch mode (rebuild on change)
```

## Documentation

- **DeveloperNotes.md** — Full architecture, implementation details, naming conventions, and rules
- **ClaudeNotes.txt** — Code review notes and remaining items
- **Module READMEs** — `src/modules/*/README.md` for per-module documentation
- **Example READMEs** — `examples/*/README.md` for per-example documentation
