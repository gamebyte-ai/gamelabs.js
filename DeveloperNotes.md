# Gamelab.js

> **This file is human-authored.** Do not edit via AI agents or automated tools. Propose changes in a separate document or issue — a maintainer will incorporate them manually.


This project is a **TypeScript skeleton + reusable modules** for web games. It is designed for:
- **AI-generated** game projects
- Consistent project structure for easy review, shared module development and usage
- Strict separation between **rendering/scene** and **game logic**


It depends on:
- **Three.js** for World (3D scene)
- **PixiJS** for HUD (2D scene and UI)
- **GSAP** for animations


## Architecture/Design decisions
- Base app class for program skeleton, users extend it and override methods to handle program flow
- Minimal dependency injection
- Simple MVP structure with strict View - ViewController separation between **rendering/scene** and **game logic**
- Use events for indirect communication
- Modules system for sharing features between projects in a consistent structure

## World
World contains a threejs scene. All childs that are directly in communication with app extend WorldViewBase. Every view can add child objects as they need.

## HUD
World contains a pixijs app. All childs that are directly in communication with app extend HudViewBase. Every view can add child objects as they need.
The HUD has 5 ordered layers (back to front), managed by the HudLayer enum. All access goes through IHud.addChild(layer, child) and IHud.removeChild(child) — layer containers are not exposed directly.

| Layer | Enum | Purpose |
|---|---|---| 
| Content | HudLayer.Content | Game HUD views (health bars, minimaps, custom overlays) |
| Screen | HudLayer.Screen | Full-screen ScreenView instances (managed by ViewFactory) |
| Popup | HudLayer.Popup | PopupView instances with blocker (managed by ViewFactory) |
| Overlay | HudLayer.Overlay | System UIs like context menus, on-screen keyboards, notifications |
| DevOverlay | HudLayer.DevOverlay | Developer tools like Logger and stats panels |

Important: Any visible UI element that should block world pointer input must have eventMode: "static" set on its background Graphics. Without this, clicks pass through to the Three.js world behind the HUD.


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


## App-wide state and events

`IApp` is a readonly snapshot of app-level state — `width`, `height`, `dpr` — bound in **both** DI containers. Anything that needs to know "how big is the canvas right now?" resolves `IApp` instead of plumbing values through constructors.

`AppEvents` is the app-level event bus (currently exposes `onResize`). `HudViewBase` and `WorldViewBase` inject both `IApp` and `AppEvents` and auto-subscribe in `postInitialize`, then call the subclass's `onResize(width, height, dpr)` — subclasses just override that method.

This replaces the older pattern where `ViewFactory.resize()` walked screens + popups; resize now flows through events, and views opt in by calling `super.postInitialize()`.


## Styles

Cross-cutting visual style is owned by `StyleManager`, bound in `viewDiContainer`. Modules ship default style entries via their bindings (e.g. `OnScreenControlsBinding` registers `OscStyleIds.Button`). Apps customize visuals by calling `styleManager.modify<TStyle>(id, partial)` — partials are deep-merged onto the existing entry, so apps can re-theme one property without redeclaring the whole style.

Style IDs follow the same namespaced-enum pattern as Asset IDs:

```ts
export enum OscStyleIds {
  Button = "Osc.Button",
  Joystick = "Osc.Joystick",
}
```

`StyledHudObject` is the base for HUD objects whose visuals come from a registered style entry — it resolves the style on construction and re-applies on changes. Most `uicomponents` widgets extend it.


## Managers / Services / Rules  (Where logic lives)
Pick the bucket **before** writing a class. The key question is: does it fail
because of the *environment* (network down, quota exceeded, permission denied)?
If yes, it's a service. If no, it's a rules class or a manager.

| Bucket | Folder | Suffix | Holds state? | Talks to outside world? | Examples |
|---|---|---|---|---|---|
| **Domain rules / operations** | `utilities/` | `*Operations` / `*Rules` / `*Solver` / `*Calculator` / `*Finder` | Yes or no | **No** | `GameOperations` (the per-game operations class in match3 and 2048), `WaterSortOperations`, `TicTacToeTurnManager` (actually a manager), match-finders, move solvers |
| **State managers** | `utilities/` | `*Manager` | Yes | **No** (uses rules + services as inputs) | `TurnManager`, `WaveManager`, `UpdateManager`, `GameCameraManager`, `SettingsManager`, `TimelineManager`, `ParticleManager` |
| **Tracks** (timeline-driven effects) | `utilities/` | `*Track` | Yes — short-lived, lifecycle-bounded | **No** | `CameraShakeTrack`, `ZoomPunchTrack`, `HitStopTrack`, `CinematicPathTrack`, `ParticleBurstTrack` |
| **Strategies** (pluggable behaviour) | `utilities/` | role-named (no generic suffix) | Yes | **No** | `FollowObject`, `FollowPosition`, `PathFollow`, `BoundsConstraint`, `DeadZoneFocusConstraint`, `WorldParticleEmitter`, `HudParticleEmitter` |
| **Services** | `services/` | `*Service` | Usually minimal (cache) | **Yes** — browser APIs, network, OS, sensors, file system | `StorageService`, `AudioService`, `NotificationService`, `GeolocationService`, `ShareService`, `AnalyticsService`, `*ApiService` |

#### Acid tests:

- **Rules / operations:** *can I unit-test it with `expect(ops.findMatches(grid)).toEqual(...)` — no DOM, no THREE/PIXI, no network stub?* If yes → it's rules. If you need to stub fetch/localStorage/audio context, it's not rules, it's a service.
- **Manager:** *does it own mutable state that outlives any single controller method?* Turn order, wave spawn state, camera rig position, settings values. Manager is the catch-all for in-app coordinators that are neither pure rules nor external boundaries.
- **Track:** *is it driven by `TimelineManager` with a duration and `onStart` / `onUpdate` / `onEnd` / `onCancel` hooks?* If yes → it's a track. Put it in `utilities/` with the `*Track` suffix; concurrent tracks of the same type are allowed and queryable through `ITimelineModel`.
- **Strategy:** *is it a swap-out implementation of an interface consumed by a manager (`ICameraFollow`, `ICameraConstraint`, `IParticleEmitter`)?* If yes → it's a strategy. Name it after the role (`FollowObject`, `BoundsConstraint`), not after a generic suffix, and put it next to the manager that consumes it.
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
│   ├──app/                IApp, AppEvents
│   ├──assets/             AssetManager, AssetRequest, AssetTypes, IAssetManager
│   ├──dev/                Logger, LogPanel, DevUtils, StatsPanel, GroundGrid
│   ├──di/                 DIContainer, InjectionToken, IInstanceResolver
│   ├──events/             Unsubscribe, UnsubscribeBag
│   ├──hud/                Hud, HudViewBase, IHud
│   ├──input/              InputManager, InputMapper, KeyboardListener, IPointerInputHandler
│   ├──services/           StorageService, AudioService                  (external-boundary code)
│   ├──styles/             StyleManager, StyledHudObject, SpriteStyle, TextStyle
│   ├──ui/                 ScreenView, PopupView, IScreenView, IPopupView, ScreenTransition, UIEvents, UIUtils
│   ├──utilities/          UpdateManager                                 (in-app coordinators)
│   ├──views/              ViewFactory, IView, IViewController, IViewFactory
│   ├──world/              World, WorldViewBase, IWorld
│   ├──GamelabsApp.ts      Base app class
│   ├──ModuleBinding.ts    Base module binding class
│   ├──types.ts            Shared types
│   └──version.ts          Version constant
├──modules
│   ├── ...                Various modules, they are explained in their own readme file
└──index.ts                Barrel exports
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
    - `onResize(width, height, dpr)`: viewport-dependent updates (called when the canvas resizes; views also receive this through `AppEvents.onResize` via `HudViewBase` / `WorldViewBase`)
- Uninitialization
    - `preDestroy()`: unsubscribe + cleanup owned resources


### Modules

Modules are a contained, configurable, feature-mechanic set for common purposes.
They are **static, boot-time bundles**. They are created once at app construction and never unloaded, reloaded, or destroyed independently.

A `ModuleBinding` is **decorator-only**: it contributes DI registrations, view registrations, and asset requests. Runtime orchestration (init-with-world, per-frame update, resize, teardown) lives in the `GamelabsApp` subclass — the binding never holds runtime state, never exposes getters for bound instances, and never adds forwarding methods (`addControl`, `addField`, ...) that proxy to bound instances. Callers resolve managers from the DI container directly (typically in `postInitialize`) and call methods on them.

Modules replicate the folder structure of a project:
```
MyModule
├──assets
├──module.json
├──README.md
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

#### Binding shape

Bindings hold no runtime state. Bind classes through the DI container, not through binding-class fields or forwarding methods.

- **Zero-arg class** → construct and bind eagerly inside `configureDI`: `diContainer.bindInstance(Class, new Class())`. Do not store the instance in a binding field.
- **Class with dependencies** → bind as a factory that resolves from DI: `diContainer.bindSingleton(Class, (r) => new Class(r.getInstance(Dep)))`. `bindSingleton` will also call `inject(resolver)` on `IInjectionTarget`s automatically.

Legitimate fields / constructor args on a binding:
- Asset request data (presets, config strings) used to populate `_assetRequestList`.
- Class or factory overrides passed via the binding's constructor for customization.
- Optional pre-built dependencies the app supplies to the binding (e.g. an app-provided model implementation).

#### `module.json`

Every built-in module has a sibling `module.json` next to its `README.md`:

```json
{
  "name": "gamecamera",
  "description": "...",
  "dependencies": ["timeline"]
}
```

The `dependencies` array lists other built-in modules whose bindings must be registered before this one. The framework does not enforce ordering at runtime — it's the app's `registerModules()` that has to respect it.

#### Module assets and bindings

- Modules may have an asset id enum (`enum MyModuleAssetIds ...`).
- Modules must have a binding class (`class MyModuleBinding extends ModuleBinding`).
  - `assetRequestList` lists assets to load.
  - `configureDI` adds DI bindings.
  - `configureViews` registers view/controller pairs.

#### Wiring runtime hooks

If a bound manager needs `initialize` / `update` / `resize` / `destroy` calls, the **app** is responsible for calling them from its lifecycle hooks. The module's README documents the wiring. Example: an app using `gamecamera` resolves `GameCameraManager` in `postInitialize`, calls `cameraManager.update(dt)` in `onStep`, and `cameraManager.resize(w, h)` in `onResize`.

Modules must be added in the app's `registerModules()` method before the rest of `configureDI()` runs. Before registration the binding can be configured:

- Asset urls can be overridden in `assetRequestList`.
- Class / factory overrides supplied via the binding constructor.

#### Update ordering across modules

When several module managers need per-frame updates, the app's `onStep` decides the order. Some orderings matter:

- `TimelineManager.update(dt)` should tick **before** any consumer that reads timeline state for the current frame. Cinematic tracks (e.g. `CameraShakeTrack`) write to consumer-side state during their `onUpdate`; consumers then need to apply that state on the same frame.
- `GameCameraManager.update(dt)` should run **after** the timeline tick, so camera offsets written by tracks land on the camera before render.
- `ParticleManager.update(dt)` is independent of camera and timeline ordering and can run last.

The framework deliberately does not auto-register module managers with `UpdateManager` — keeping ordering in the app makes ordering bugs (a track writing offsets after the camera already applied them) explicit and visible in one place.

#### Built-in modules

| Module | Purpose |
|---|---|
| `uicomponents` | Button, Background, Image, layout, list, scrollview, dropdown, toggle, slider, label widgets backed by `StyledHudObject` |
| `gamecamera` | Camera controllers (front/topdown/isometric/orbital, 2d/3d) + named-channel offsets, follow strategies, constraints, cinematic tracks |
| `gamegrid` | Grid system with grids/cells/items models, views, and per-board object creators |
| `mainscreen` | Main menu screen with play/settings buttons |
| `levelprogressscreen` | Level selection screen with progress |
| `onscreencontrols` | Virtual joystick and buttons for touch input |
| `settings` | Settings manager with persistence and a popup UI |
| `audiodsp` | DSP effects chain (filter, reverb, delay, distortion, compressor) |
| `timeline` | Time-bounded `Track` lifecycle (start/update/end/cancel) for effects and cutscene beats |
| `particles` | View-side particle plumbing (THREE + Pixi emitters, pooling, global budget) |

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
