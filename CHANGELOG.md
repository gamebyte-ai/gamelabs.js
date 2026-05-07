# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-05-06

### Added

- **`timeline` module** — `TimelineManager` + `Track` base class with `onStart` / `onUpdate` / `onEnd` / `onCancel` hooks, concurrent tracks, query/cancel by id or type. Replaces ad-hoc per-effect timers with one inspectable coordinator. `ITimelineModel` exposes the live track set for debug overlays and game logic.
- **`particles` module** — `ParticleManager` + `IParticleEmitter` with `WorldParticleEmitter` (THREE) / `HudParticleEmitter` (Pixi) base classes, pooled lifetime ticking, behavior dispatch, and a global `ParticleBudget` shared across world and HUD emitters. `ParticleBurstTrack` integrates with the timeline module.
- **`gamecamera` — named-channel offsets.** `CameraOffset` type + `setOffset(id, ...)` / `clearOffset(id)` / `clearAllOffsets()` / `getOffset(id)` / `setBaseFov(fov)` on `GameCameraManager`. Per-frame apply layers `focus` (pre-controller) and `localPosition` / `worldPosition` / `rotation` / `fov` / `orthoSize` (post-controller) on top of the active controller's transform. Lets effects (shake, recoil, look-ahead, …) live entirely in userland.
- **`gamecamera` — cinematic tracks.** `CameraShakeTrack`, `ZoomPunchTrack`, `DollyZoomTrack`, `HitStopTrack`, `CinematicPathTrack` — timeline-driven effect tracks that drive the offset channels for the duration of the track and clean up on end/cancel.
- **`gamecamera` — pluggable follow strategies.** `ICameraFollow` interface + `FollowObject`, `FollowPosition`, `PathFollow` implementations. `setFollow(strategy)` / `getFollow()` swap strategies; the legacy `followObject` / `followPosition` / `stopFollow` methods are kept as snap-on-first-call convenience wrappers.
- **`gamecamera` — pluggable constraints.** `ICameraConstraint` interface (`applyToFocus` pre-controller and/or `applyToCamera` post-transform hooks) + `BoundsConstraint` (clamp position to an AABB) and `DeadZoneFocusConstraint` (windowed focal point on a configurable plane). Manager exposes `setConstraint` / `clearConstraint` / `clearAllConstraints` / `getConstraint`.
- **`gamecamera` — `getCamera()` accessor** so tracks can read the active camera's `fov` / `position` at start (used by `DollyZoomTrack`). Mutation still goes through offsets / constraints / follow.
- **`avoidance` example** — death-shake driven through `TimelineManager` + `CameraShakeTrack`; propulsion + explosion particle FX via the new `particles` module.
- **Module metadata** — every built-in module now ships a sibling `module.json` (`name`, `description`, `dependencies`).

### Changed

- **`gamecamera` — `_applyPositionToCamera` now layers offsets on top of the controller transform.** Behavior preserved when no offsets are registered. `_writeOrthoProjection(size)` accepts an effective size so the projection follows `orthoSize` deltas.
- **`gamecamera` — follow logic moved out of the manager** into `ICameraFollow` strategies. Legacy `followObject` / `followPosition` retained as wrappers, so existing apps need no changes.
- **`gamecamera` — `module.json`** declares `timeline` as a dependency for cinematic-track support.

## [2.0.0] - 2026-04-24

### BREAKING CHANGES

Consumers upgrading from 1.0.0 must update any code that touched these APIs:

- `OnScreenControlsBinding` — removed `manager` getter, `addControl(config)`, and `removeControl(id)`. Resolve `OnScreenControlManager` from the DI container instead.
- `GameCameraBinding` — removed `cameraManager` getter. Resolve `GameCameraManager` from the DI container.
- `GameGridBinding` — removed `model` and `events` getters. Resolve `GridsModel` / `GridEvents` from the DI container.
- `SettingsBinding` — removed `addField(field)` forwarding and stored instances. Resolve `SettingsManager` from the DI container and call `addField` on it.
- `ScreenView` / `PopupView` — no longer self-apply `this.layout = { width, height }` in `postInitialize`. Subclasses that relied on the implicit `@pixi/layout` root must set `this.layout` themselves (typically in `onResize`).
- `ViewFactory.resize(width, height, dpr)` — removed. Resize events now flow through `AppEvents.onResize`; subscribe via `HudViewBase` / `WorldViewBase` (automatic for subclasses that call `super.postInitialize()`).
- `DIContainer.bindSingleton` / `bindInstance` — now throw when an alias token is already bound as a primary, and vice versa. Previously silent hijack.
- `GridCell.setItem` / `GridItem.setCell` — marked `@internal` and no longer appear in the published `.d.ts`.

### Added
- `IApp` — readonly app-state interface (`width`, `height`, `dpr`) bound in both DI containers.
- `AppEvents` — app-level event bus (`onResize`). Views and app code subscribe to get viewport changes.
- `HudViewBase` / `WorldViewBase` now inject `IApp` + `AppEvents` and auto-fire `onResize(w, h, dpr)` in `postInitialize`. Subclasses just override `onResize`.
- `FullscreenLayoutComponent` (uicomponents) — container whose `@pixi/layout` box tracks the canvas via `AppEvents`, independent of parent.
- `stripInternal: true` in `tsconfig.json` so `@internal` members disappear from the published `.d.ts`.
- Module lifecycle + binding-shape rules documented in `AGENTS.md`, `DeveloperNotes.md`, and `ModuleBinding` JSDoc.
- DI tests for alias/primary collision guards (3 new cases).

### Changed
- **`ModuleBinding` contract is static / boot-only.** Bindings contribute DI registrations, view registrations, and asset requests. Runtime orchestration (init-with-world, per-frame update, resize, teardown) lives in the `GamelabsApp` subclass. Removed binding-field instances, getters, and forwarding methods from every module:
  - `OnScreenControlsBinding` — dropped `manager` getter, `addControl`, `removeControl`. Apps resolve `OnScreenControlManager` from DI.
  - `GameCameraBinding` — dropped `cameraManager` getter. Apps resolve `GameCameraManager` from DI in `postInitialize`; five example apps migrated.
  - `SettingsBinding` — dropped three stored instances, `addField` forwarding, and the manual `inject()` workaround. `SettingsManager` is now bound as a factory that auto-fires `inject()`.
  - `GameGridBinding` — dropped `model` and `events` getters. Apps resolve `GridsModel` from DI.
- `SettingsManager` and `GridsModel` — `inject()`-only dependencies; constructor params moved into `inject()` so all deps flow through one path.
- `ScreenView` and `PopupView` are layout-neutral. `this.layout` and the `"layout"` event listeners removed. Subclasses that want layout set `this.layout` in `onResize`. The clipMask (`ScreenView`) and blocker (`PopupView`) are now sized directly from `onResize`.
- `ViewFactory.resize()` removed. Resize flows through `AppEvents` instead of the factory walking screens + popups.
- `GridCell.setItem` / `GridItem.setCell` marked `@internal` — hidden from the published API.

### Fixed
- **DI:** `bindAliases()` now rejects aliases already bound as primaries, and `bindInstance`/`bindSingleton` reject primaries already registered as aliases. Previously silent hijack.
- **Grids:** `GridsModel.addGrid()` throws on duplicate id; `Grid.setCellItem()` maintains both sides of the cell/item back-reference and throws if the incoming item is already attached elsewhere; `GridsView.removeGrid()` and `preDestroy()` dispose geometries and materials on torn-down subtrees.
- **Camera:** `GameCameraManager._ensureCameraForController()` no longer clobbers the smart ortho↔perspective transition position with `existing.position`. The overwrite became a fallback gated on the transition not firing.
- **On-screen controls:** `removeControl()` releases the control's virtual keys before deletion, so downstream listeners don't latch when a control is removed while held.
- **Input:** `InputManager._onPointerDown` now calls `setPointerCapture(pointerId)` so drag-off-canvas releases route back correctly.
- **Keyboard:** `KeyboardListener` handles `window.blur` and `document.visibilitychange` by firing release callbacks for every held key — fixes keys stuck after alt-tab.
- **Settings popup:** `SettingsPopupViewController` subscribes to `SettingsEvents.onValueChanged` and pushes fresh values into the view via `updateFieldValue`. Reset-to-defaults and stepped-slider snapback now visibly update.
- **Match3 swap:** `_swapItems` detaches both cells before re-assigning, consistent with the new `setCellItem` invariants.
- **View resize regression:** 13 view overrides across `src/modules` and `examples` now call `super.postInitialize()` so the `AppEvents` subscription fires. Also added `onResize` overrides to three popup subclasses (`tictactoe/WinPopupView`, `watersort/WinPopupView`, `avoidance/GameOverPopupView`) so their content stays centered after `PopupView` dropped its root layout.

### Removed
- `(this as any).layout` casts across six game-screen and three popup views — `pixi-layout-augment.d.ts` already makes `this.layout` work.
- Dead `this.layout = {...}` lines from `2048`, `match3`, and `watersort` `GameScreenView` files (those views position children manually).
- `viewFactory.resize(w, h, dpr)` from `GamelabsApp._onWindowResize` — replaced by `_appEvents.emitResize`.
- Architectural issue A1 ("module API not lifecycle-aware") from `ISSUES.md` — resolved as a design choice, not tech debt.

### Examples
- `colorblockjam` — color-matching brick puzzle with pre-baked GLB brick shapes, silhouette outlines, smooth drag, shatter/gate polish, and audio settings wiring.
- `hexasort` — hexagonal sort puzzle with decoupled `SortingManager`.
- `towerdefense` — tower defense with pure-state managers and reconcile-based rendering.

## [1.0.0] - 2026-04-22

> Published to npm but not documented at the time. The following is reconstructed from git history and is approximate.

### Added
- **GameModel pattern** — `match3`, `2048`, `tictactoe`, `avoidance`, `watersort` each extract a dedicated `GameModel` plus a `GameOperations` class for pure domain logic, separated from controllers.
- **UI components** — `ToggleComponent`, `SliderComponent` added alongside the existing Button/Background/Image/layout components.
- **Readonly model interfaces** — `ISettingsModel`, readonly grid model interfaces for safer consumer access.
- Fail-fast initialization guard in `GamelabsApp`; `AudioService` throws on double-init; `StorageService` wraps its I/O in try/catch.

### Changed
- **HUD layering** — `Hud` now exposes a 5-layer system (replacing the old `contentLayer` / `overlayLayer` split).
- **HUD API** — `Hud.app` is now private; consumers use `canvas`, `resolution`, `hitTest` instead.
- Modules (`gamecamera`, `gamegrid`, `settings`, `onscreencontrols`, `uicomponents`) reorganized to follow project conventions (views in `views/`, module-extension code co-located).
- Screen transitions and `PopupView` blocker rebuilt after HUD layering change.

### Fixed
- `PopupView` blocker and `SettingsPopupView` panel background rendering.
- HUD hit-testing, popup blocker interaction, CSS stacking, and camera drag input regressions.
- TicTacToe DI double-inject, asset paths, camera, and input.
- Many lint warnings resolved to zero (`no-explicit-any` in DI/ViewFactory and PixiJS interop).

## [0.3.0] - 2026-04-15

> Published but not documented at the time. The following is reconstructed from git history and is approximate.

### Added
- `Constants` convention documented in `DeveloperNotes.md` — pure types and static tables live in `constants/` directories.
- 12 findings from a Codex review added to `ISSUES.md`, with 2 prior issues marked resolved.

### Changed
- Internal cleanup: removed shared-context pattern from core; regenerated `package-lock.json` to fix CI `npm ci` failures.

## [0.2.0] - 2026-04-07

### Added
- ESLint + Prettier configuration for code consistency
- Battle-tested unit tests with Vitest — 49 tests covering DIContainer (27), UnsubscribeBag (17), InjectionToken (2), including adversarial edge cases: circular dependency detection, factory/inject failure recovery, re-entrant flush, state corruption scenarios
- GitHub Actions CI pipeline (typecheck, lint, format, test, build on Node 20 + 22)
- CHANGELOG.md for version tracking
- ISSUES.md documenting 9 known issues with severity ratings
- Avoidance game example (enemy spawning, waves, game over popup, score tracking)
- Water Sort puzzle example with tween pour animations
- UI components module: ButtonComponent, BackgroundComponent, ImageComponent, VerticalLayoutComponent, HorizontalLayoutComponent
- Popup system with PopupView
- On-screen controls module: virtual joystick and buttons for touch input
- Settings module: settings manager with persistence and popup UI
- Audio DSP module: effects chain (filter, reverb, delay, distortion, compressor)
- AudioManager core service with asset integration
- KeyboardListener and InputMapper for keyboard input handling
- StorageService for persistent key-value storage
- Documentation site with HTML pages (`docs/`, `build:docs` script)

### Changed
- Package name changed from `gamelabsjs` to `@gamebyte/gamelabsjs`
- Screen and popup creation now uses string ids
- Screen creation moved from ViewFactory method to UI events

### Fixed
- All import references updated to scoped package name across docs and examples

## [0.1.0] - 2025-03-01

### Added
- Initial release
- Core framework: GamelabsApp, DI containers, View/Controller pattern
- Two rendering layers: World (Three.js) and HUD (PixiJS)
- Module system with ModuleBinding
- Asset management with fallback support
- Input system with pointer handling and raycasting
- Screen transitions (slide_in_left, slide_in_right, slide_in_down, slide_in_up, instant)
- Built-in modules: gamecamera, gamegrid, mainscreen, levelprogressscreen
- Camera controllers: front2d, front3d, topdown2d, topdown3d, isometric2d, isometric3d, orbital3d
- Grid system for tile-based games
- Development tools: Logger, StatsPanel, GroundGrid
- Examples: helloworld, screens, tictactoe, match3
