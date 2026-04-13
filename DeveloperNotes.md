# Gamelab.js

> **This file is human-authored.** Do not edit via AI agents or automated tools. Propose changes in a separate document or issue — a maintainer will incorporate them manually.


This project is a **TypeScript skeleton + reusable modules** for web games. It is designed for:
- **AI-generated** game projects
- Consistent project structure for easy review, shared module development and usage
- Strict separation between **rendering/scene** and **game logic**


It depends on:
- **Three.js** for 3D (world scene)
- **PixiJS** for 2D (HUD and UI)
- **GSAP** for animations


## Architecture/Design decisions
- Base app class for program skeleton, users extend it and override methods to handle program flow
- Minimal dependency injection
- Simple MVP structure with strict View - ViewController separation between **rendering/scene** and **game logic**
- Use events for indirect communication
- Modules system for sharing features between projects in a consistent structure


### File naming conventions
- Interfaces: `IFoo.ts` (prefix with `I`)
- HUD views: `FooView.pixi.ts` (suffix `.pixi.ts`)
- World views: `FooView.three.ts` (suffix `.three.ts`)
- View controllers: `FooViewController.ts` (every controller in this codebase implements `IViewController<IFooView>`; the suffix stays explicit so concrete class names match the interface and disambiguate from things like `ICameraController` in the gamecamera module)
- Events: `FooEvents.ts`
- Models: `Foo.ts` or `FooModel.ts`, For readonly model interface `IFoo.ts` or `IFooModel.ts`
- App-level classes keep the **game** prefix
    - Application: `MyGameApp.ts`
    - Config: `MyGameConfig.ts`
    - Asset IDs: `MyGameAssetIds.ts` (enum with namespaced values: `MyGame.ItemName`)
    - UI IDs: `MyGameUIIds.ts` (enum with namespaced values: `MyGame.GameScreen`, `MyGame.WinPopup`)
- For small projects where a single class is sufficient for a task `Game` prefix can be used (`GameOperations`, `GameEvents`, `GameBoardModel`, `GameScreenViewController`, ...)

## Constants
- Enums and types that contain only constant values (no logic, no class behavior) must be in the `constants/` folder.

## Dependency injection
- Minimal dependency injection with only singleton binding
- Interface tokens use the InjectionToken pattern: a const and a type with the same name so interfaces can be used as DI keys (`export const IFoo = new InjectionToken("IFoo")`)
- There are two DI containers
    - `Gamelabs.diContainer`
        - Common tools(logger,...), Models, Events, Services, Manager, and Other utilities are bound to this
        - Given to View controllers, Services, Managers, and Other utilities for instance resolving
    - `Gamelabs.viewDiContainer`
        - Common tools(logger,...), Scene managers are bound to this
        - Given to Views for instance resolving


## Events
- Event classes must use the `Set<cb>` + `Unsubscribe` pattern. Do not use single-listener setters.
- Use `UnsubscribeBag` for event cleanup in classes. Do not track unsubscribe functions manually.


## Managers / Services / Rules  (Where logic lives)
Pick the bucket **before** writing a class. The key question is: does it fail
because of the *environment* (network down, quota exceeded, permission denied)?
If yes, it's a service. If no, it's a rules class or a manager.

| Bucket | Folder | Suffix | Holds state? | Talks to outside world? | Examples |
|---|---|---|---|---|---|
| **Domain rules / operations** | `utilities/` | `*Operations` / `*Rules` / `*Solver` / `*Calculator` / `*Finder` | Yes or no | **No** | `GameOperations` (the per-game operations class in match3 and 2048), `WaterSortOperations`, `TicTacToeTurnManager` (actually a manager), match-finders, move solvers |
| **State managers** | `utilities/` | `*Manager` | Yes | **No** (uses rules + services as inputs) | `TurnManager`, `WaveManager`, `UpdateManager`, `GameCameraManager`, `SettingsManager` |
| **Services** | `services/` | `*Service` | Usually minimal (cache) | **Yes** — browser APIs, network, OS, sensors, file system | `StorageService`, `AudioService`, `NotificationService`, `GeolocationService`, `ShareService`, `AnalyticsService`, `*ApiService` |

#### Acid tests:

- **Rules / operations:** *can I unit-test it with `expect(ops.findMatches(grid)).toEqual(...)` — no DOM, no THREE/PIXI, no network stub?* If yes → it's rules. If you need to stub fetch/localStorage/audio context, it's not rules, it's a service.
- **Manager:** *does it own mutable state that outlives any single controller method?* Turn order, wave spawn state, camera rig position, settings values. Manager is the catch-all for in-app coordinators that are neither pure rules nor external boundaries.
- **Service:** *can this fail because of the environment and not because of the inputs?* Network timeout, quota exceeded, autoplay policy, permission denied. If yes → service. Services must be mockable for tests (tests should never actually hit the network or localStorage).


### Views
- View classes manage scene objects, handle rendering settings, create sub views, handle pointer inputs
- Two types of View containers and views exist
    - World and WorldViews for game scene and objects (implemented with **Three.js**)
    - Hud and HudViews for UIs and overlays (implemented with **PixiJS**)
- Every view has a view interface to give restricted access to controller (`interface IMyView extends IView`)
- View class extends base classes and implements all methods (`MyView extends WorldViewBase implements IMyView`)
    - WorldViewBase; extend for common 3d world objects
    - HudViewBase: extend for common 2d hud object
- There are special view for ui
    - ScreenView
        - They are automatically added to a specific Hud container
        - They cover whole canvas and only one of them is active at a time
        - They have transition after creation and before destruction (interaction should be blocked while `isInTransition` is true)
    - PopupView:  extend for special 2d hud objects that are centered on screen, when multiple popups shown they act as a stack and cover previous one


### View Controllers
- They are the thin coordination layer between views, utilities, and events. They own no domain logic and no mutable state.
- They implement IViewController (`class MyViewController implements IViewController<IMyView>`)
- Listen and dispatch events: subscribe to state changes, emit intents. No direct controller-to-controller calls.
- Listens view events, handle view behaviors and responses via `IView` child interfaces
- Perform sequence of operations: "when user clicks swap → validate via Operations → if valid, animate via View → emit score change via Events"
- Map view input to domain calls: "convert screen coordinates to grid positions, translate button presses to game actions"
#### Rules
1. No domain logic. No game rules, no state mutations, no computations (loops, searches, aggregations). All of that belongs in utilities/ (*Operations, *Manager, *Rules).
2. Read-only model access. Controllers access model state through readonly interfaces (IGameState, IGridState), not mutable model references. The utility that owns the state exposes the readonly view.
3. Indirect communication only. Controllers communicate through event classes. Never call another controller directly, never hold a reference to one.
4. Branching and sequencing is not "logic." Translating view input into domain calls and routing results to views is the controller's job — don't extract trivial if/else routing into utility classes.
5. View access through interfaces. Controllers reference IMyView, never the concrete MyView.pixi.ts class. This keeps controllers renderer-agnostic.
6. Cleanup via UnsubscribeBag. All event subscriptions go through UnsubscribeBag and are flushed in destroy().

### Using Views and Controllers
- Register classes : View and viewController classes are registered in `IViewFactory` (`this.viewFactory.register<MyView, MyViewController> (MyView, MyViewController);`)
- Create instance : `IViewFactory` create methods are used to instantiate views then they are added to a parent object or directly to World or Hud (`const myView = this.viewFactory.createView(MyView);    this.world.addView(myView);`)
- Use `UIEvents.createScreen` to create screen views
- Use `UIEvents.createPopup`, `UIEvents.removeTopPopup`, `UIEvents.removeAllPopups` to manage popup views


## Library folder structure (`src/`)
```
src
├──core
│   ├──constants/          Enums, constant types 
│   ├──assets/            AssetManager, AssetRequest, AssetTypes, IAssetManager
│   ├──dev/               Logger, LogPanel, DevUtils, StatsPanel, GroundGrid
│   ├──di/                DIContainer, InjectionToken, IInstanceResolver
│   ├──events/            Unsubscribe, UnsubscribeBag
│   ├──hud/               Hud, HudViewBase, IHud
│   ├──input/             InputManager, IPointerInputHandler
│   ├──services/          StorageService, AudioService   (external-boundary code)
│   ├──utilities/         UpdateManager                  (in-app coordinators)
│   ├──ui/                ScreenView, ScreenTransition, IScreenView
│   ├──views/             ViewFactory, IView, IViewController, IViewFactory
│   ├──world/             World, WorldViewBase, IWorld
│   ├──GamelabsApp.ts     Base app class
│   └──ModuleBinding.ts   Base module binding class
├──modules
│   ├── ...               Various modules, they are explained in their own readme file
└──index.ts               Barrel exports
```

## Game project folder structure
```
MyGame
├──assets
└──src
    ├──constants                MyModes.ts, MyGameConstants.ts, enums
    ├──controllers              MyScreenViewController.ts, MyGridViewController.ts
    ├──events                   MyEvents.ts
    ├──models                   MyModel.ts
    ├──services                 MyApiService.ts, MyShareService.ts      (external I/O only; skip the folder if you have none)
    ├──utilities                MyOperations.ts, MyRules.ts, MyManager.ts   (in-app logic + stateful managers)
    ├──views                    IMyScreenView.ts, MyScreenView.pixi.ts, IMyGridView.ts, MyGridView.three.ts
    ├──MyGameApp.ts             (extends GamelabsApp)
    ├──MyGameAssetIds.ts        (unique asset ids with enums)
    ├──MyGameUIIds.ts           (unique ui ids for screens and popups with enums)
    └──MyGameConfig.ts          (initial values, tweaks, timings, sizes, animation values, ...)
```


## Asset management

- Apps and modules define their unique asset ids with enums (`enum MyGameAssetIds { Missile = "MyGame.Missile"}`)
- All asset requests must be added using load methods on `IAssetManager`
- Asset loading is guaranteed to be completed before `GamelabsApp.postInitialize()` method call. Failed items will use fallback assets.
- Loaded asset can be requested from method `IAssetManager.getAsset<T>(id: string): T`
- Assets that are failed to load and using fallbacks can be queried with `IAssetManager.isFallback(id: string): boolean` method


### App

Your `MyGameApp` class extends `GamelabsApp` and implements following methods:
- Initialization methods (will be called in this order)
    - `registerModules()`: register `ModuleBinding` instances with `addModule()` method
    - `configureDI()`:  binding injection instances and types
    - `configureViews()`: register view/controller pairs into `viewFactory`
    - `loadAssets()`: enqueue app-specific assets in `assetManager`
    - `postInitialize()`: create initial screens/views, load levels and hook event subscriptions (called after assets are loaded)
- Runtime methods
    - `onStep(timestepSeconds)`: per-frame logic hook (called after `updateManager.tick()`)
- Uninitialization
    - `preDestroy()`: unsubscribe + cleanup owned resources


### Modules

Modules are a contained, configurable, feature-mechanic set for common purposes. 
They replicate folder structure of project
```
MyModule
├──assets
└──src
    ├──controllers
    ├──events
    ├──models
    ├──utilities
    ├──views
    ├──MyModuleBinding.ts
    ├──MyModuleAssetIds.ts
    └──index.ts
```
- Modules may have an asset id enums as described above (`enum MyModuleAssetIds ...`)
- Modules must have a bindings class (`class MyModuleBinding extends ModuleBinding ...`)
 - `assetRequestList` is list of assets
 - `configureDI` method is for adding di bindings from module
 - `configureViews` method is for view - view controller registration from module

Modules must be added in app `registerModules()` method before it can be used.
Before registration it can be modified
- Asset urls can be overridden in `assetRequestList`
- Di and view configuration items can be altered

### Customizing Modules
When a project extends a bound module (custom binding, controllers, views, models, utilities), place all related files in a subfolder under `src/modules/<module-name>/` that mirrors the module's internal structure. This keeps module overrides grouped and separated from app-level code.
```
MyGame/src
├── modules/
│   └── gamegrid/                            ← all gamegrid overrides
│       ├── MyGameGridBinding.ts
│       ├── controllers/
│       │   └── GameGridsViewController.ts
│       ├── models/
│       │   └── GameBoardItem.ts
│       ├── utilities/
│       │   └── GameGridAllocator.ts
│       └── views/
│           ├── GameBoardCellObject.ts
│           ├── GameBoardItemObject.ts
│           ├── GameBoardObjectCreator.ts
│           └── GameBoardsView.three.ts
├── controllers/                             ← app-level controllers only
└── views/                                   ← app-level views only
```

### DevUtils

`IDevUtils` provides built-in development tools. 
It is accessible via `this.devUtils` in your app class.
Also `IDevUtils` is available via both DI containers (`diContainer.getInstance(IDevUtils)`).
- `devUtils.logger` is an integrated logger
    - Use `logger.log(message, type?)` to log messages with `LogTypes.Info`, `LogTypes.Warning`, or `LogTypes.Error`.
    - Use `logger.show(true/false)` to toggle the on-screen log panel visibility.
- `devUtils.statsPanel` is an on screen panel for FPS/render stats
    - Use `statsPanel.show(true/false)` to toggle.
- `devUtils.groundGrid` — 3D ground grid helper for the World scene.
    - Use `groundGrid.show(true/false)` to toggle visibility.


### Commands
- `npm run build` — build the library (tsup)
- `npm run typecheck` — type check (tsc --noEmit)
- Examples: `cd examples/<name> && npm install && npm run dev`


## Rules and constraints
- Scene setup (fog, lights, post-processing) belongs in views, not in the app class.
- Views must not contain game logic or state mutations. Views render and report input; controllers decide what happens.
- Controllers must reference view interfaces (`IMyView`), not concrete view classes (`MyView`).
- Asset IDs must be enums with namespaced string values (`"MyGame.ItemName"`), not plain objects or bare strings.
- Modules must not depend on app-specific code. They should be reusable across projects.
- Do not override lifecycle methods without calling `super` where required (`super.inject()`, `super.destroy()`, etc.).
- Do not create empty lifecycle overrides (empty `loadAssets()`, `onStep()` that only calls `super`). Only override when adding behavior.
- Game related object should be in world, even if it is a 2d game.