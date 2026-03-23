# Agents.md — Project policy for AI contributors

This project is a **TypeScript skeleton + reusable modules** for web games (Three.js + PixiJS). It targets **AI-generated projects** where humans review every change. Follow these policies when modifying code.

## Architecture policies

1. **Views render; Controllers/Models own behavior and state.**
   - Put rendering and scene graph code in Views (`WorldViewBase`, `HudViewBase`, `ScreenView`), not in controllers.
   - Put behavior, orchestration, and state in Controllers and Models, not in views.
   - Controllers depend on view interfaces (e.g. `IMainScreenView`), not concrete Pixi/Three types.

2. **Cross-feature communication goes through Events injected via DI.**
   - Use events (bound in `configureDI`) for communication between controllers and features.
   - Avoid controllers calling each other directly or reaching into app-specific globals.

3. **Modules must not depend on app-specific globals.**
   - Modules are portable units; they receive DI and view factories, not global app instances.
   - Keep module APIs small: view contracts as interfaces, events/models in DI, wiring in `ModuleBinding`.

4. **New features should land as modules whenever reusable.**
   - If a feature is likely to be reused across projects, implement it as a `ModuleBinding`.
   - Implement `configureDI(diContainer)`, `configureViews(viewFactory)`, and `getAssetRequests()` for modules.

## Project layout

- `src/core/`: app lifecycle, world/hud, DI, views/controllers, screens
- `src/modules/`: reusable feature modules (each has its own binding, views, controllers, events)
- `examples/`: reference apps that compose modules

## Adding features

- **New reusable feature**: create a `ModuleBinding` subclass in `src/modules/<name>/`, register it in the app via `addModule()`.
- **App-specific logic**: implement in the app subclass (`configureDI`, `configureViews`, `loadAssets`, `postInitialize`).
- **Views**: extend `WorldViewBase` (3D) or `HudViewBase`/`ScreenView` (2D); expose a small interface for controllers.
- **Controllers**: implement `IViewController<TView>`; resolve dependencies via `resolver.getInstance(...)`.

## Coding conventions

- Access modifiers on all class members; `_` prefix for private/protected fields.
- Keep method/constructor parameters and import statements on a single line.
- See `.cursor/rules/` for file-specific standards.
