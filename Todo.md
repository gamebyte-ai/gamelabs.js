# Todo (Roadmap)

This repo is a **project skeleton + reusable modules**, not a full engine. This file tracks future work for humans and AI contributors reviewing the codebase.

## Current state (as of April 2026, v1.0.0)

- **Build / test / CI**: `npm run typecheck`, `lint`, `format:check`, `test`, `build` — all gates pass on Node 20 + 22 via GitHub Actions.
- **Architecture docs**: `AGENTS.md` (policies + module lifecycle + binding shape rules), `DeveloperNotes.md` (architecture details), `README.md` (quick start + structure), per-module READMEs.
- **Core**: `IApp` + `AppEvents` for app-wide state/events. Views subscribe to resize via `HudViewBase`/`WorldViewBase`, which inject `IApp` + `AppEvents` automatically. `ViewFactory` is layout/resize-neutral.
- **Modules** (all boot-only `ModuleBinding`s, DI-resolved managers): `gamecamera`, `gamegrid`, `mainscreen`, `levelprogressscreen`, `onscreencontrols`, `settings`, `uicomponents`, `audiodsp`.
- **Examples**: `helloworld`, `screens`, `tictactoe`, `match3`, `avoidance`, `watersort`, `2048` — all build clean.
- **Assets**: `AssetManager` with fail-fast awaitable `waitForAll()` and `failedIds` set. Used across the library.
- **Tests**: 58 Vitest tests (DIContainer, UnsubscribeBag, InjectionToken).
- **Layout**: `@pixi/layout` is opt-in. Core views are layout-neutral; apps and uicomponents set `this.layout` where they need it. `FullscreenLayoutComponent` available for HUD widgets.

## Open issues

See `ISSUES.md` for the maintained list. Currently open:

- **Low:** no tests for `AssetManager`, `ViewFactory`, `InputManager`, or modules.
- **Low:** no integration smoke test for module DI collisions.
- **Arch:** `bindInstance()` vs `bindSingleton()` `inject()` asymmetry (A1 in ISSUES.md). Deferred.

## P1 — Correctness & observability

- **Module DI collision smoke test.** An integration test that imports every module, wires them into a throwaway app, and verifies DI tokens + view registrations don't collide. Matches `ISSUES.md` low-priority item.
- **Asset loading progress callbacks.** `AssetManager` exposes counts and `waitForAll()`. Per-asset `onLoaded(id)` / `onFailed(id, error)` events would let loading screens show real progress without polling.
- **Screen transition cancellation rules.** Define what happens when `createScreen()` fires while the previous screen is still in `isInTransition`. Current behavior is implicit; should be documented or enforced.

## P2 — Type safety at wiring boundaries

- Reduce remaining `any` / `unknown` at `IViewContainer` attachment points and the few remaining `(x as any)` casts outside of container.layout (where the augment is the fix).
- Typed parent/child contracts for common cases (Pixi containers vs. Three objects) so "invalid parent type" fails at compile time.

## P2 — Module library hygiene

- Lightweight versioning policy (breaking vs. additive changes). Useful now that 1.0.0 is published.
- Coverage for modules that still have zero tests: `AssetManager`, `ViewFactory`, `InputManager`, and each feature module.

## P2 — Developer experience

- CLI / template for bootstrapping a new game project with the canonical layout and a minimal working app.
- Example build smoke checks in CI (currently only the library itself is gated; examples are built manually).

## Resolved since last update

Items carried from the earlier roadmap that are now done:

- Canonical project layout documented (`AGENTS.md`, `README.md`, `DeveloperNotes.md`).
- ESLint + Prettier + format enforcement.
- GitHub Actions CI (typecheck, lint, format, test, build on Node 20 + 22).
- `ResizeObserver` support for mount-element resize tracking (in `GamelabsApp`).
- `ScreenView.isInTransition` + input blocking during transitions.
- Fail-fast `initialize()` with `_initFailed` guard against retries.
- `AssetManager.waitForAll()` awaitable primitive (replaced polling pattern).
- Module lifecycle + binding-shape conventions documented (`AGENTS.md` section, `ModuleBinding` JSDoc).
- Per-module READMEs exist for every module.
