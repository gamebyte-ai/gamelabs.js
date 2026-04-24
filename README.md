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
    super({ mount: stageEl });
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
├── controllers/       FooViewController.ts
├── events/            FooEvents.ts
├── models/            FooModel.ts
├── services/          FooApiService.ts, FooShareService.ts   (external I/O only; omit if you have none)
├── utilities/         FooOperations.ts, FooRules.ts, FooManager.ts   (in-app logic)
├── views/             IFooView.ts, FooView.pixi.ts, FooView.three.ts
├── MyGameApp.ts
├── MyGameAssetIds.ts
└── MyGameConfig.ts
```

### Where logic lives

Three buckets with strict definitions:

- **Domain rules / operations** (`utilities/`, suffix `*Operations` / `*Rules` / `*Solver`): pure in-app logic on models. No DOM, no THREE/PIXI, no I/O. Unit-testable without a view. Examples: `GameOperations` (the per-game operations class in match3 and 2048), `WaterSortOperations`, match-finders, move solvers.
- **State managers** (`utilities/`, suffix `*Manager`): own mutable subsystem state across controller methods. Examples: `TurnManager`, `WaveManager`, `UpdateManager`, `SettingsManager`.
- **Services** (`services/`, suffix `*Service`): boundaries to the outside world — anything that can fail because of the environment. Examples: `StorageService`, `AudioService`, `NotificationService`, `*ApiService`. **Do not use the `*Service` suffix for in-app logic.**

Controllers stay thin: sequence async work, branch on results, dispatch events. Extract computation into an `*Operations` / `*Rules` / `*Manager` class in `utilities/` when it would be unit-testable without a view. See `DeveloperNotes.md` for the full rationale and a worked example.

### File naming conventions

- Interfaces: `IFoo.ts` (prefix with `I`)
- HUD views: `FooView.pixi.ts` (suffix `.pixi.ts`)
- World views: `FooView.three.ts` (suffix `.three.ts`)
- View controllers: `FooViewController.ts` (every controller in this codebase implements `IViewController<IFooView>`; the suffix stays explicit so concrete class names match the interface and disambiguate from things like `ICameraController`)
- Events: `FooEvents.ts`
- In-domain logic: `FooOperations.ts` / `FooRules.ts` / `FooManager.ts` (in `utilities/`)
- External-boundary services: `FooService.ts` (in `services/`)
- Asset IDs: `MyGameAssetIds.ts` (enum with namespaced values: `"MyGame.ItemName"`)
- Every per-board `gamegrid` class an example defines uses the role-based `GameBoard*`
  prefix (`GameBoardItem`, `IGameBoardsView`, `GameBoardsView`, `GameBoardsViewController`,
  `GameBoardCellObject`, `GameBoardItemObject`, `GameBoardItemObjectOptions`,
  `GameBoardObjectCreator`) instead of a game-specific prefix. App / Config / AssetIds
  / Events / Operations / Binding / screen views keep the game prefix. See
  `DeveloperNotes.md` for the canonical table, and `examples/match3` / `examples/2048`
  for the convention applied end-to-end.

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
| `2048` | 2048 sliding-tile puzzle with keyboard / swipe input and best-score persistence |
| `colorblockjam` | Color-matching brick puzzle with pre-baked GLB brick shapes, silhouette outlines, and smooth drag |
| `hexasort` | Hexagonal sort puzzle with decoupled sorting manager |
| `towerdefense` | Tower defense with pure-state managers and reconcile-based rendering |

```bash
npm run build                    # Build library first
cd examples/<name> && npm i && npm run dev
```

## Commands

```bash
npm run build         # Build library (tsup)
npm run typecheck     # Type check (tsc --noEmit)
npm run lint          # ESLint
npm run format:check  # Prettier check
npm test              # Vitest
npm run dev           # Watch mode (rebuild on change)
```

CI gate order: `typecheck` → `lint` → `format:check` → `test` → `build`.

## Documentation

- **AGENTS.md** — Project policies, architecture rules, module lifecycle and binding-shape conventions
- **DeveloperNotes.md** — Full architecture, implementation details, naming conventions
- **CHANGELOG.md** — Version history
- **ISSUES.md** — Known bugs and technical debt with severity ratings
- **Module READMEs** — `src/modules/*/README.md` for per-module documentation
- **Example READMEs** — `examples/*/README.md` for per-example documentation
