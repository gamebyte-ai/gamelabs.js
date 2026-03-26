THIS IS NOT COMPLETE! ignore this file for now


This project is a **TypeScript skeleton + reusable modules** for web games. It is designed for:
- **AI-generated** game projects
- Consistant project structure for easy review and module sharing
- Strict separation between **rendering/scene** and **game logic**

It dependes on:
- **Three.js** for 3D (world / scene)
- **PixiJS** for 2D (HUD / UI)
- **GSAP** for animations


## Architecture/Design decisions
- Base app class for program skeleton, users extend it and override methods to handle program flow
- Minimal dependency injection
- MVC implementation with strict View-ViewController separation between **rendering/scene** and **game logic**
- Two types of views
 - World and WorldViews for game scene and objects (implemented with **Three.js**)
 - Hud and HudViews for UIs and overlays (implemented with **PixiJS**)
- Modules system for sharing features between projects in a consistant structure


## Implementation details

### App class
Your `YourGameApp` class extends `GamelabsApp` and implements following methods:
- `registerModules()`: call `this.addModule(...)` to register `ModuleBinding` instances
- `configureDI()`: use `viewDiContainer` for view injections, use `diContainer` for view controllers and others classes
- `configureViews()`: register view/controller pairs into `viewFactory`
- `loadAssets()`: enqueue app-specific assets in `assetManager`
- `postInitialize()`: create initial screens/views, load levels and hook event subscriptions (called after assets are loaded)
- `onStep(timestepSeconds)`: per-frame logic hook (called after `updateService.tick()`)
- `preDestroy()`: unsubscribe + cleanup owned resources

### Asset management
- Apps and modules define their unique asset ids with enums (`enum YourGameAssetIds { Missile = "YourGame.Missile"}`)
- All asset requests must be added using load methods on `IAssetManager`
- Asset loading is guaranteed to be completed before `postInitialize()` method call. Failed items will use fallback assets.
- Loaded asset can be requested from `getAsset<T>(id: string): T` method of `IAssetManager`

### MVC implementation
- IView-IViewController implementations are registered in ViewFactory
- IView instances are created with `IViewFactory` create methods then added to a parent object or directly to World or Hud
- `IView` implementations manage scene objects, handle rendering settings, create sub views, handle pointer inputs
- `IViewController` implementations listen view and other events, handle view behaviours and responses via `IView` child interfaces













## Views (`IView`, base view classes)
Views are responsible for rendering and user interaction details.

- `IView` lifecycle is wired by `ViewFactory`:
  - `view.initialize(viewFactory, assetLoader)`
  - `view.postInitialize()`
  - `view.setController(controller)`
  - `controller.initialize(view, resolver)`
- Base classes implement the standard wiring fields and default destruction:
  - `WorldViewBase` (Three.js) for world views
  - `HudViewBase` (PixiJS) for HUD views
  - `ScreenView` (PixiJS) for full-screen HUD screens + transitions




(`IView`->`IViewController` / `ViewController`->`IView`)
- Two types of views
 - World for game scene and objects (**Three.js**)
 - Hud for UIs and overlays (**PixiJS**)
- Modules for common features



Dependency Injection system




- World views
 - extend `WorldViewBase`
 - all game objects will be in world (even if it is a 2d game)

- Hud views
 - extend `HudViewBase`
 - UI and overlay graphics are hud views
 - `ScreenView` are special hud views, they cover whole canvas and only one of them is active at a time (on exit transition old screen may still be in scene but it should block interaction while `isInTransition` is true)







binding to di containers


module structure


using modules


creating modules

 
cloning modules









My todo

- define folder and class names (models, utilities, services, ...)

- popup views
- physics integration
- requesting assets after initialization
- GamelabsConfig for common options
- Audio
- Save (settings, progress)