# Agents.md — Project policy for AI contributors

This project is a **TypeScript skeleton + reusable modules** for web games (Three.js + PixiJS). It targets **AI-generated projects** where humans review every change. Follow these policies when modifying code.

Read `DeveloperNotes.md` for full architecture and implementation details.

## Rules and constraints

- Views must NOT access `diContainer`. Views receive `viewDiContainer` only.
- Controllers must NOT import or manipulate rendering objects (Three.js meshes, PixiJS containers, etc.). Controllers talk to views only through `IView` interfaces.
- Cross-feature communication must go through event classes, not direct references between controllers.
- Do not call other controllers directly. Use events to decouple.
- Scene setup (fog, lights, post-processing) belongs in views, not in the app class.
- Views must not contain game logic or state mutations. Views render and report input; controllers decide what happens.
- Event classes must use the `Set<cb>` + `Unsubscribe` pattern. Do not use single-listener setters.
- Use `UnsubscribeBag` for event cleanup in controllers. Do not track unsubscribe functions manually.
- Controllers must reference view interfaces (`IMyView`), not concrete view classes (`MyView`).
- Asset IDs must be enums with namespaced string values (`"MyGame.ItemName"`), not plain objects or bare strings.
- Put in-app logic (domain rules, operations, stateful managers) in `utilities/`. Put boundaries to the outside world (storage, network, browser/OS APIs, audio output) in `services/`. Put event classes in `events/`. See "Where logic lives" below.
- Modules must not depend on app-specific code. They should be reusable across projects.
- Do not override lifecycle methods without calling `super` where required (`super.inject()`, `super.destroy()`, etc.).
- Do not create empty lifecycle overrides (empty `loadAssets()`, `onStep()` that only calls `super`). Only override when adding behavior.

## Where logic lives

Three buckets with strict definitions. Decide which one a new class belongs to
**before** writing it, not after.

- **Domain rules / operations** — `utilities/`, suffix `*Rules` / `*Operations` /
  `*Solver` / `*Calculator`. Pure in-app logic that computes results from
  models. Examples: match-finding, swap validation, move planning, win
  detection, gravity. No DOM, no THREE/PIXI, no I/O. Must be unit-testable
  without a view present. Holding game state is fine (`_score`, grid
  references) — the key property is that nothing fails because of the
  *environment*.

- **State managers** — `utilities/`, suffix `*Manager`. Own mutable state for
  a subsystem and coordinate it across controllers. Examples: `TurnManager`,
  `WaveManager`, `UpdateManager` (per-frame tick dispatch). May call rules and
  services. Lifecycle is longer than a single controller method.

- **Services** — `services/`, suffix `*Service`. Boundaries to the outside
  world. Anything that can fail because of the environment: storage
  (`StorageService`), network (`*ApiService`), browser/OS APIs
  (`NotificationService`, `GeolocationService`, `ShareService`), audio output
  (`AudioService`). Side-effecting by definition. Mockable for tests.
  **Do not use the `*Service` suffix for in-app logic.** If a class holds game
  rules or coordinates state but never talks to a browser/OS/network API, it
  is an `*Operations` / `*Manager`, not a service.

Controllers stay thin. They sequence async work, branch on results, dispatch
events, and handle view input. When a controller starts doing real computation
(loops, searches, aggregations, anything unit-testable in isolation), extract
that work into an `*Operations` / `*Manager` / `*Rules` class in `utilities/`.

## File naming conventions

- Interfaces: `IFoo.ts` (prefix with `I`)
- HUD views: `FooView.pixi.ts` (suffix `.pixi.ts`)
- World views: `FooView.three.ts` (suffix `.three.ts`)
- View controllers: `FooViewController.ts` (every controller in this codebase is a view controller — even though there's only one kind, the suffix stays explicit so it matches the `IViewController<IFooView>` interface and disambiguates from things like `ICameraController` in the gamecamera module)
- Events: `FooEvents.ts`
- Models: `Foo.ts` or `FooModel.ts`
- Config: `MyGameConfig.ts`
- Asset IDs: `MyGameAssetIds.ts` (enum with namespaced values: `"MyGame.ItemName"`)
- In-domain logic: `FooOperations.ts` / `FooRules.ts` / `FooSolver.ts` (in `utilities/`)
- State managers: `FooManager.ts` (in `utilities/`)
- External-boundary services: `FooService.ts` (in `services/`)
- Every per-board class an example defines on top of the `gamegrid` module uses
  the role-based `GameBoard*` prefix instead of the game-specific prefix:
  `GameBoardItem` (model), `IGameBoardsView`, `GameBoardsView` (world view),
  `GameBoardsViewController`, `GameBoardCellObject`, `GameBoardItemObject`,
  `GameBoardItemObjectOptions`, `GameBoardObjectCreator`. Generic per-game
  pieces (`GameOperations`, `GameEvents`, `GameScreenViewController`) also drop
  the game prefix because they describe the role, not the game. App / Config /
  AssetIds / Binding classes keep the game prefix (`Match3App`, `Match3Config`,
  `Match3AssetIds`, `Match3GameGridBinding`, `Game2048App`, `Game2048Config`,
  `Game2048AssetIds`, `Game2048GameGridBinding`, ...). Each example owns its own
  copies of the `GameOperations` / `GameEvents` / `GameBoard*` / `GameScreen*`
  files inside its own `src/` tree — they don't collide because they're scoped
  to the example folder. See `DeveloperNotes.md` for the canonical table.

## Project structure

Game projects follow this layout:
```
MyGame/src
├── controllers/       MyScreenViewController.ts, MyGridViewController.ts
├── events/            MyEvents.ts
├── models/            MyModel.ts
├── services/          MyApiService.ts, MyShareService.ts   (external I/O only)
├── utilities/         MyOperations.ts, MyRules.ts, MyManager.ts   (in-app logic)
├── views/             IMyView.ts, MyView.pixi.ts, MyView.three.ts
├── MyGameApp.ts       (extends GamelabsApp)
├── MyGameAssetIds.ts  (unique asset ids with enums)
└── MyGameConfig.ts    (initial values, tweaks, timings, sizes, animation values)
```

`services/` is only present when the game actually talks to external systems
(storage, network, platform APIs). A simple offline game can skip it entirely.

Modules follow the same layout under `src/modules/<name>/src/` with a `ModuleBinding` and `index.ts`.

## App lifecycle (called in this order)

1. `registerModules()` — register `ModuleBinding` instances with `addModule()`
2. `configureDI()` — bind instances and types to DI containers
3. `configureViews()` — register view/controller pairs via `viewFactory.register()`
4. `loadAssets()` — enqueue app-specific assets in `assetManager`
5. `postInitialize()` — create initial screens/views, subscribe to events (assets are loaded)
6. `onStep(dt)` — per-frame logic hook (runtime)
7. `preDestroy()` — cleanup (uninitialization)

## DI containers

- `diContainer` — bind controllers, utilities, events, models. Given to controllers and utilities via `inject(resolver)`.
- `viewDiContainer` — bind view-layer tools (AssetManager, ViewFactory, InputManager). Given to views via `inject(resolver)`.
- Interface tokens use the InjectionToken pattern: `export const IFoo = new InjectionToken<IFoo>("IFoo")`

## View/Controller pattern

- Define a view interface: `interface IMyView extends IView { ... }`
- Extend `WorldViewBase` (3D), `HudViewBase` (2D), or `ScreenView` (full-screen 2D)
- Controller implements `IViewController<IMyView>`
- Register: `viewFactory.register<MyView, MyViewController>(MyView, MyViewController)`
- Create: `viewFactory.createView(MyView)` or `viewFactory.createScreenView(MyScreenView, transition)`

## Coding conventions

- Access modifiers on all class members
- `_` prefix for private/protected fields
- Keep method parameters and import statements on a single line

## Commands

```bash
npm run build       # Build library (tsup)
npm run typecheck   # Type check (tsc --noEmit)
```
