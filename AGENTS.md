# Agents.md — Project policy for AI contributors

This project is a **TypeScript skeleton + reusable modules** for web games (Three.js + PixiJS). It targets **AI-generated projects** where humans review every change. Follow these policies when modifying code.

Read `DeveloperNotes.md` for full architecture and implementation details. **Do not edit `DeveloperNotes.md`** — it is human-authored. If you find information that needs updating, note it in your response and let the maintainer update the file.

## Error handling philosophy

This is a **game framework**, not a web app framework. Games are single-page, tightly coupled state machines — not collections of independent page components.

- **Initialization is all-or-nothing.** If DI binding, module setup, or asset loading fails, the application is non-functional. There is no "partial run," no retry, no rollback. Let the error propagate to the top-level caller. The only useful runtime action is showing a clear error and halting.
- **Do not design recovery paths for state corruption.** A half-wired DI container or corrupted game state will crash unpredictably later. Retry/rollback patterns add untested complexity for scenarios that cannot succeed at runtime and give a false illusion of recoverability.
- **Web-page resilience patterns are wrong here.** In a multi-page site, a broken sidebar doesn't kill the checkout flow and the user can refresh. In a game, corrupted state means the entire application is broken — there is no independent functionality to fall back to.
- **The real fix is: fix the bug, rebuild, redeploy.** Design error paths to help developers diagnose root causes, not to keep a broken app limping along.
- **Resource cleanup must be thorough.** Leaked event listeners, audio nodes, or GPU resources compound over a game session. Every `destroy()`/`preDestroy()` must clean up completely.

This applies to: `GamelabsApp.initialize()`, DI container, module `configureDI()`, asset loading, and any other one-time setup that establishes application state.

## Rules and constraints

- Views must NOT access `diContainer`. Views receive `viewDiContainer` only.
- Controllers must NOT import or manipulate rendering objects (Three.js meshes, PixiJS containers, etc.). Controllers talk to views only through `IView` interfaces.
- Controllers must NOT contain domain logic — no game rules, no state mutations, no computations (loops, searches, aggregations). Use utilities/managers/services for all operations.
- Controllers must access model state through readonly interfaces (`IGameState`, `IGridState`), not mutable model references. The utility that owns the state exposes the readonly view.
- Cross-feature communication must go through event classes, not direct references between controllers.
- Do not call other controllers directly. Use events to decouple.
- Branching and sequencing is not "logic" — translating view input into domain calls and routing results to views is the controller's job. Do not extract trivial if/else routing into utility classes.
- Scene setup (fog, lights, post-processing) belongs in views, not in the app class.
- Views must not contain game logic or state mutations. Views render and report input; controllers decide what happens.
- Event classes must use the `Set<cb>` + `Unsubscribe` pattern. Do not use single-listener setters.
- Use `UnsubscribeBag` for event cleanup in classes. Do not track unsubscribe functions manually.
- Controllers must reference view interfaces (`IMyView`), not concrete view classes (`MyView`).
- Asset IDs must be enums with namespaced string values (`"MyGame.ItemName"`), not plain objects or bare strings.
- Put in-app logic (domain rules, operations, stateful managers) in `utilities/`. Put boundaries to the outside world (storage, network, browser/OS APIs, audio output) in `services/`. Put event classes in `events/`. See "Where logic lives" below.
- Modules must not depend on app-specific code. They should be reusable across projects.
- Do not override lifecycle methods without calling `super` where required (`super.inject()`, `super.destroy()`, etc.).
- Do not create empty lifecycle overrides (empty `loadAssets()`, `onStep()` that only calls `super`). Only override when adding behavior.
- Game-related objects should be in World, even if it is a 2D game.

## Where logic lives

Three buckets with strict definitions. Decide which one a new class belongs to
**before** writing it, not after.

- **Domain rules / operations** — `utilities/`, suffix `*Rules` / `*Operations` /
  `*Solver` / `*Calculator` / `*Finder`. Pure in-app logic that computes results from
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

Controllers are the thin coordination layer between views, utilities, and events.
They own no domain logic and no mutable state. They sequence operations, branch
on results, map view input to domain calls, and listen/dispatch events. When a
controller starts doing real computation (loops, searches, aggregations, anything
unit-testable in isolation), extract that work into an `*Operations` / `*Manager`
/ `*Rules` class in `utilities/`. Branching and sequencing is their job — don't
over-extract trivial routing into unnecessary helper classes.

## File naming conventions

- Interfaces: `IFoo.ts` (prefix with `I`)
- HUD views: `FooView.pixi.ts` (suffix `.pixi.ts`)
- World views: `FooView.three.ts` (suffix `.three.ts`)
- View controllers: `FooViewController.ts` (every controller in this codebase is a view controller — even though there's only one kind, the suffix stays explicit so it matches the `IViewController<IFooView>` interface and disambiguates from things like `ICameraController` in the gamecamera module)
- Events: `FooEvents.ts`
- Models: `Foo.ts` or `FooModel.ts`. For readonly model interfaces: `IFoo.ts` or `IFooModel.ts`
- Config: `MyGameConfig.ts`
- Asset IDs: `MyGameAssetIds.ts` (enum with namespaced values: `MyGame.ItemName`)
- UI IDs: `MyGameUIIds.ts` (enum with namespaced values: `MyGame.GameScreen`, `MyGame.WinPopup`)
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
  to the example folder.

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
├── MyGameUIIds.ts     (unique ui ids for screens and popups with enums)
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

- `diContainer` — bind common tools (logger, ...), models, events, services, managers, and other utilities. Given to controllers, services, managers, and other utilities via `inject(resolver)`.
- `viewDiContainer` — bind common tools (logger, ...), scene managers (AssetManager, ViewFactory, InputManager). Given to views via `inject(resolver)`.
- Interface tokens use the InjectionToken pattern: `export const IFoo = new InjectionToken<IFoo>("IFoo")`

## View/Controller pattern

- Define a view interface: `interface IMyView extends IView { ... }`
- Extend `WorldViewBase` (3D), `HudViewBase` (2D), or `ScreenView` (full-screen 2D)
- Controller implements `IViewController<IMyView>`
- Register: `viewFactory.register<MyView, MyViewController>(MyView, MyViewController)`
- Create views: `viewFactory.createView(MyView)`
- Create screens: `UIEvents.createScreen(id, transition)`
- Manage popups: `UIEvents.createPopup(id)`, `UIEvents.removeTopPopup()`, `UIEvents.removeAllPopups()`

## Coding conventions

- Always use explicit access modifiers (`public`, `protected`, `private`) on all class members — fields, methods, getters, setters, constructors. Never rely on TypeScript's implicit `public`.
- Private and protected field names must have an underscore prefix: `private _count`, `protected _logger`. Public fields do not use the prefix.
- When using the bound handler pattern (e.g. `this.on("event", handler)`), if the handler body is longer than one line, extract it into a named method. Inline arrow functions are fine for single-expression handlers.
  ```ts
  // Good — single line
  this.on("pointerdown", (e) => e.stopPropagation());

  // Good — multi-line extracted to method
  this.on("pointerdown", this.onPointerDown);
  private onPointerDown(e: PointerEvent): void {
    e.stopPropagation();
    this._handleInput(e);
  }

  // Bad — multi-line inline
  this.on("pointerdown", (e) => {
    e.stopPropagation();
    this._handleInput(e);
  });
  ```
- Keep method parameters and import statements on a single line

## Commands

```bash
npm run build          # Build library (tsup)
npm run typecheck      # Type check (tsc --noEmit)
npm run lint           # ESLint
npm run format:check   # Prettier check
npm test               # Vitest
```

Examples: `cd examples/<name> && npm install && npm run dev`
