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
- Do not put files in a `services/` folder. Use `utilities/` for services, managers, and tools. Use `events/` for event classes.
- Modules must not depend on app-specific code. They should be reusable across projects.
- Do not override lifecycle methods without calling `super` where required (`super.inject()`, `super.destroy()`, etc.).
- Do not create empty lifecycle overrides (empty `loadAssets()`, `onStep()` that only calls `super`). Only override when adding behavior.

## File naming conventions

- Interfaces: `IFoo.ts` (prefix with `I`)
- HUD views: `FooView.pixi.ts` (suffix `.pixi.ts`)
- World views: `FooView.three.ts` (suffix `.three.ts`)
- Controllers: `FooController.ts`
- Events: `FooEvents.ts`
- Models: `Foo.ts` or `FooModel.ts`
- Config: `MyGameConfig.ts`
- Asset IDs: `MyGameAssetIds.ts` (enum with namespaced values: `"MyGame.ItemName"`)

## Project structure

Game projects follow this layout:
```
MyGame/src
├── controllers/       MyScreenController.ts, MyGridController.ts
├── events/            MyEvents.ts
├── models/            MyModel.ts
├── utilities/         MyService.ts, MyUtilities.ts, MyOperations.ts
├── views/             IMyView.ts, MyView.pixi.ts, MyView.three.ts
├── MyGameApp.ts       (extends GamelabsApp)
├── MyGameAssetIds.ts  (unique asset ids with enums)
└── MyGameConfig.ts    (initial values, tweaks, timings, sizes, animation values)
```

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
- Register: `viewFactory.register<MyView, MyController>(MyView, MyController)`
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
