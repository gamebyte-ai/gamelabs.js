# Gamelabsjs

Gamelabsjs is a **TypeScript project skeleton + reusable modules** for web games that combine:

- **Three.js** for 3D (world / scene graph)
- **PixiJS** for 2D (HUD / UI)

It is designed primarily for **AI-generated game projects** where **humans review every output**, so the main value is **consistency**:

- consistent program flow across projects
- strict separation between **rendering/scene** and **game logic**
- feature modules that can be dropped into new projects without re-implementing the same scaffolding

## What this is (and isn’t)

- **This is**: a small set of opinionated primitives that enforce a repeatable app structure (lifecycle hooks, view/controller wiring, DI, asset loading, screen navigation).
- **This is not**: a full game engine. It intentionally does not hide Three/Pixi behind a giant abstraction layer.

## Core primitives (the “opinionated” part)

- **`GamelabsApp`**: the app lifecycle + main loop.
  - Creates `World` (Three) and `Hud` (Pixi)
  - Runs module hooks in a consistent order: register DI, register views, load assets, then start the game
- **`World`**: a thin Three.js wrapper that owns renderer/scene/camera and implements `IViewContainer`.
- **`Hud`**: a thin Pixi wrapper that owns the Pixi `Application`, layering, optional stats overlay, and implements `IViewContainer`.
- **`ViewFactory` + `IViewFactory`**: centralized wiring for View ↔ Controller pairs. Views receive a restricted factory so they can create child views/screens without having access to global registration.
- **`ScreenView` + `IScreen`**: optional “screen” concept for high-level navigation (menus, gameplay, etc.).
- **`IModuleBinding`**: a portability contract for feature modules (configure DI, register views, load assets).

## Typical flow

At runtime you generally:

1. `await app.initialize()` (creates world/hud, configures DI/views/modules, loads assets)
2. `app.mainLoop()` (ticks `UpdateService`, then renders world and (optionally) HUD)

See `examples/` for working reference apps.

## Install (as a dependency)

`gamelabsjs` exposes `three`, `pixi.js`, `@pixi/layout`, and `@pixi/ui` as peer dependencies.

```bash
npm i gamelabsjs three pixi.js @pixi/layout @pixi/ui
```

## Developing this repo

```bash
npm i
npm run build
npm run typecheck
```

For iterative work (rebuild `dist/` on change):

```bash
npm run dev
```

## Running the examples

The examples are Vite apps that alias `gamelabsjs` to the repo’s local `dist/index.js`, so build/watch the repo first.

Example 01:

```bash
npm run build
cd examples/example01
npm i
npm run dev
```

Example 02:

```bash
npm run build
cd examples/example02
npm i
npm run dev
```

## Repository layout

- `src/core/`: primitives (app lifecycle, rendering layers, DI, views/controllers, screens)
- `src/modules/`: reusable feature modules (drop-in screens, controllers, events, assets)
- `examples/`: reference apps that show the intended structure and wiring

## Design rules (for keeping projects reviewable)

- Views render; controllers handle behavior. Don’t bury “game logic” inside rendering classes.
- New features should land as **modules** whenever they can be reused across projects.
- Keep module APIs small and explicit: events/models in DI, view contracts as interfaces, wiring in module bindings.
