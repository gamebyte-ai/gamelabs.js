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

### Vite setup

Consumers using Vite need three settings in `vite.config.ts`. The `templates/gamebyte_template/vite.config.ts` is a ready-to-copy starter; the minimum is:

```ts
import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: {
    // Keep @gamebyte/gamelabsjs un-pre-bundled so its default-skin
    // asset URLs (new URL("./assets/...", import.meta.url)) resolve
    // against node_modules/@gamebyte/gamelabsjs/dist/, not .vite/deps/.
    // Without this, UI components render with magenta missing-texture
    // markers in dev.
    exclude: ["@gamebyte/gamelabsjs"],
    // Two CJS transitive deps the exclude above would otherwise also
    // skip — `import { Signal }` / `import { vector }` would throw
    // against their CJS-only modules without this.
    include: ["@pixi/ui > typed-signals", "@gamebyte/gamelabsjs > @js-basics/vector"],
  },
  resolve: {
    // One copy of three.js / Pixi shared between app and framework.
    // Mixed copies crash Yoga (in @pixi/layout) at runtime.
    dedupe: ["three", "pixi.js", "@pixi/layout", "@pixi/ui"],
  },
});
```

Production builds (`vite build`) pick up the framework's PNG/JPG assets automatically — Rollup statically detects the `new URL("./assets/...", import.meta.url)` pattern and emits them into the consumer's `dist/`.

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

- **Domain rules / operations** (`utilities/`, suffix `*Operations` / `*Rules` / `*Solver`): pure in-app logic on models. No DOM, no THREE/PIXI, no I/O. Unit-testable without a view. Examples: `*Operations` per-game classes, match-finders, move solvers.
- **State managers** (`utilities/`, suffix `*Manager`): own mutable subsystem state across controller methods. Examples: `TurnManager`, `WaveManager`, `UpdateManager`, `SettingsManager`.
- **Services** (`services/`, suffix `*Service`): boundaries to the outside world — anything that can fail because of the environment. Examples: `StorageService`, `AudioService`, `NotificationService`, `*ApiService`. **Do not use the `*Service` suffix for in-app logic.**

Controllers stay thin: sequence async work, branch on results, dispatch events. Extract computation into an `*Operations` / `*Rules` / `*Manager` class in `utilities/` when it would be unit-testable without a view.

### File naming conventions

- Interfaces: `IFoo.ts` (prefix with `I`)
- HUD views: `FooView.pixi.ts` (suffix `.pixi.ts`)
- World views: `FooView.three.ts` (suffix `.three.ts`)
- View controllers: `FooViewController.ts` (every controller in this codebase implements `IViewController<IFooView>`; the suffix stays explicit so concrete class names match the interface and disambiguate from things like `ICameraController`)
- Events: `FooEvents.ts`
- In-domain logic: `FooOperations.ts` / `FooRules.ts` / `FooManager.ts` (in `utilities/`)
- External-boundary services: `FooService.ts` (in `services/`)
- Asset IDs: `MyGameAssetIds.ts` (enum with namespaced values: `"MyGame.ItemName"`)
- Every per-board `gamegrid` class uses the role-based `GameBoard*`
  prefix (`GameBoardItem`, `IGameBoardsView`, `GameBoardsView`, `GameBoardsViewController`,
  `GameBoardCellObject`, `GameBoardItemObject`, `GameBoardItemObjectOptions`,
  `GameBoardObjectCreator`) instead of a game-specific prefix. App / Config / AssetIds
  / Events / Operations / Binding / screen views keep the game prefix.

## Repository layout

```
src/
├── core/          App lifecycle, DI, views/controllers, world, hud, screens, assets, input, audio
├── modules/       Reusable feature modules
│   ├── uicomponents/         Button, Background, Image, layout components
│   ├── gamecamera/           Camera controllers + named-channel offsets, follow strategies, constraints, cinematic tracks
│   ├── gamegrid/             Grid system with models, views, cell/item objects
│   ├── mainscreen/           Main menu screen with play/settings buttons
│   ├── levelprogressscreen/  Level selection screen with progress
│   ├── onscreencontrols/     Virtual buttons and joysticks for touch input
│   ├── settings/             Settings manager with persistence and popup UI
│   ├── audiodsp/             DSP effects chain (filter, reverb, delay, distortion)
│   ├── timeline/             Time-bounded Track lifecycle (start/update/end/cancel) for effects and cutscene beats
│   └── particles/            View-side particle plumbing (THREE + Pixi emitters, pooling, global budget)
└── index.ts       Barrel exports
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

- **CHANGELOG.md** — Version history
- **ISSUES.md** — Known bugs and technical debt with severity ratings
- **Module READMEs** — `src/modules/*/README.md` for per-module documentation
