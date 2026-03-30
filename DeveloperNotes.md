# Gamelab.js

This project is a **TypeScript skeleton + reusable modules** for web games. It is designed for:
- **AI-generated** game projects
- Consistent project structure for easy review, shared module development and usage
- Strict separation between **rendering/scene** and **game logic**

It depends on:
- **Three.js** for 3D (world / scene)
- **PixiJS** for 2D (HUD / UI)
- **GSAP** for animations


## Architecture/Design decisions
- Base app class for program skeleton, users extend it and override methods to handle program flow
- Minimal dependency injection with two containers
    - `Gamelabs.diContainer`
        - Common tools, Models, Events, Utilities are bound to this
        - Given to view controllers and utilities
    - `Gamelabs.viewDiContainer`
        - Common tools, Scene managers are bound to this
        - Given to views
- Strict View - ViewController separation between **rendering/scene** and **game logic**
    - Two types of views
        - World and WorldViews for game scene and objects (implemented with **Three.js**)
        - Hud and HudViews for UIs and overlays (implemented with **PixiJS**)
- Modules system for sharing features between projects in a consistent structure


### File naming conventions
- Interfaces: `IFoo.ts` (prefix with `I`)
- HUD views: `FooView.pixi.ts` (suffix `.pixi.ts`)
- World views: `FooView.three.ts` (suffix `.three.ts`)
- Controllers: `FooController.ts`
- Events: `FooEvents.ts`
- Models: `Foo.ts` or `FooModel.ts`
- Config: `MyGameConfig.ts`
- Asset IDs: `MyGameAssetIds.ts` (enum with namespaced values: `"MyGame.ItemName"`)


## Library folder structure (`src/`)
```
src
├──core
│   ├──assets/            AssetManager, AssetRequest, AssetTypes, IAssetManager
│   ├──dev/               Logger, LogPanel, DevUtils, StatsPanel, GroundGrid
│   ├──di/                DIContainer, InjectionToken, IInstanceResolver
│   ├──events/            Unsubscribe, UnsubscribeBag
│   ├──hud/               Hud, HudViewBase, IHud
│   ├──input/             InputManager, IPointerInputHandler
│   ├──services/          UpdateService
│   ├──ui/                ScreenView, ScreenTransition, IScreenView
│   ├──views/             ViewFactory, IView, IViewController, IViewFactory
│   ├──world/             World, WorldViewBase, IWorld
│   ├──GamelabsApp.ts     Base app class
│   └──ModuleBinding.ts   Base module binding class
├──modules
│   ├──gamecamera/        GameCameraBinding, GameCameraManager, camera controllers
│   ├──gamegrid/          GameGridBinding, Grid, GridsModel, GridsView, GridsViewController
│   ├──mainscreen/        MainScreenBinding, MainScreenView, MainScreenController
│   └──levelprogressscreen/  LevelProgressScreenBinding, LevelProgressScreenView
└──index.ts               Barrel exports
```

## Game project folder structure
```
MyGame
├──assets
└──src
    ├──controllers              MyScreenController.ts, MyGridController.ts
    ├──events                   MyEvents.ts
    ├──models                   MyModel.ts
    ├──utilities                MyService.ts, MyUtilities.ts, MyOperations.ts
    ├──views                    IMyScreenView.ts, MyScreenView.pixi.ts, IMyGridView.ts, MyGridView.three.ts
    ├──MyGameApp.ts             (extends GamelabsApp)
    ├──MyGameAssetIds.ts        (unique asset ids with enums)
    └──MyGameConfig.ts          (initial values, tweaks, timings, sizes, animation values, ...)
```

## Implementation details


### Asset management

- Apps and modules define their unique asset ids with enums (`enum MyGameAssetIds { Missile = "MyGame.Missile"}`)
- All asset requests must be added using load methods on `IAssetManager`
- Asset loading is guaranteed to be completed before `GamelabsApp.postInitialize()` method call. Failed items will use fallback assets.
- Loaded asset can be requested from method `IAssetManager.getAsset<T>(id: string): T`
- Assets that are failed to load and using fallbacks can be queried with `IAssetManager.isFallback(id: string): boolean` method


### Dependency injection

There are two DI containers
- `diContainer`; bind common and controller/utility injections to this container
- `viewDiContainer`; bind common and view only injections to this container
- Interface tokens use the InjectionToken pattern: a const and a type with the same name so interfaces can be used as DI keys (`export const IFoo = new InjectionToken("IFoo")`)


### App

Your `MyGameApp` class extends `GamelabsApp` and implements following methods:
- Initialization methods (will be called in this order)
    - `registerModules()`: register `ModuleBinding` instances with `addModule()` method
    - `configureDI()`:  binding injection instances and types
    - `configureViews()`: register view/controller pairs into `viewFactory`
    - `loadAssets()`: enqueue app-specific assets in `assetManager`
    - `postInitialize()`: create initial screens/views, load levels and hook event subscriptions (called after assets are loaded)
- Runtime methods
    - `onStep(timestepSeconds)`: per-frame logic hook (called after `updateService.tick()`)
- Uninitialization
    - `preDestroy()`: unsubscribe + cleanup owned resources


### Events

Events are used for communication between controllers and utilities.


### Utilities

Utilities (services, manager, tools, ...) are used by view controllers and utilities. They can listen and dispatch events.


### Views

- View interface is defined with methods to access from controller (`interface IMyView extends IView`)
- View class extends either WorldViewBase, HudViewBase or ScreenView and implements all methods (`MyView extends WorldViewBase implements IMyView`)
- View classes manage scene objects, handle rendering settings, create sub views, handle pointer inputs

### View controllers

 - View controller implements IViewController (`class MyViewController implements IViewController<IMyView>`)
 - View controller listens view and other events, handle view behaviors and responses via `IView` child interfaces

### Using views

- Register classes : View and viewController classes are registered in `IViewFactory` (`this.viewFactory.register<MyView, MyViewController> (MyView, MyViewController);`)
- Create instance : `IViewFactory` create methods are used to instantiate views then they are added to a parent object or directly to World or Hud (`const myView = this.viewFactory.createView(MyView);    this.world.addView(myView);`)

### Screen views

- Screens are special hud views
- They are automatically added to a specific Hud container
- They cover whole canvas and only one of them is active at a time
- They have transition after creation and before destruction (interaction should be blocked while `isInTransition` is true)


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



### Commands
- `npm run build` — build the library (tsup)
- `npm run typecheck` — type check (tsc --noEmit)
- Examples: `cd examples/<name> && npm install && npm run dev`


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
- Do not put files in a `services/` folder. Use `utilities/` for services, managers, and tools. Use `events/` for event classes.
- Modules must not depend on app-specific code. They should be reusable across projects.
- Do not override lifecycle methods without calling `super` where required (`super.inject()`, `super.destroy()`, etc.).
- Do not create empty lifecycle overrides (empty `loadAssets()`, `onStep()` that only calls `super`). Only override when adding behavior.
