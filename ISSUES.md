# Known Issues & Technical Debt

Last updated: April 2026 (re-evaluated after full refactor session).

Total: **14 active issues** (0 Critical, 5 High, 5 Medium, 2 Low, 2 Architectural).

---

## High — Silent Errors, Resource Leaks, Broken Subsystems

### 1. DI aliasing can silently hijack an already-bound primary token

**Location:** `src/core/di/DIContainer.ts:74-84`

**Problem:** `bindAliases()` only checks `aliasToPrimary.get(alias)` for conflicts with other aliases, but does NOT check `providers.has(alias)`. A later binding can add an alias that is an already-bound primary token. `getInstance()` checks `aliasToPrimary` first, so the original primary's value is hijacked silently.

**Fix:** In `bindAliases()`, reject aliases that are already primary tokens: `if (this.providers.has(alias)) throw ...`.

---

### 2. InputManager loses pointer release outside canvas

**Location:** `src/core/input/InputManager.ts:74-89`

**Problem:** All listeners are on `_eventTarget`. No `setPointerCapture()`, no window-level fallback. If the user presses down and drags out, `pointerup` fires on the target element, not the event target. Drag/press state sticks.

**Fix:** Call `setPointerCapture(pointerId)` on pointerdown, or add window-level pointerup/pointercancel fallback.

---

### 4. OnScreenControlManager.removeControl() leaves virtual keys latched

**Location:** `src/modules/onscreencontrols/src/utilities/OnScreenControlManager.ts:38-42`

**Problem:** `removeControl()` deletes config and emits event but never releases pressed button keys or joystick direction keys in `_keysDown`. Removed-while-pressed controls stay "pressed" forever.

**Fix:** In `removeControl()`, release all pressed keys associated with the control before deletion.

---

### 5. Duplicate grid IDs corrupt view/model

**Location:** `src/modules/gamegrid/src/models/GridsModel.ts:21-24`

**Problem:** `addGrid()` overwrites the map entry without removing the old grid. Old `GridObject` remains in the scene, unreachable, never disposed.

**Fix:** Reject duplicate IDs (throw) or call `removeGrid(id)` first.

---

### 6. Camera mode switching discards computed position

**Location:** `src/modules/gamecamera/src/utilities/GameCameraManager.ts:142-144`

**Problem:** `_ensureCameraForController()` computes a smart position for ortho/perspective transitions (lines 128-139), then unconditionally overwrites it with `this._currentPosition.copy(existing.position)`. Camera jumps on mode switch.

**Fix:** Remove the unconditional overwrite, or make it a fallback only when the smart path didn't fire.

---

## Medium — Correctness, Robustness, Lifecycle Gaps

### 7. Grid.setCellItem() doesn't maintain item-cell back-references

**Location:** `src/modules/gamegrid/src/models/Grid.ts:78-83`

**Problem:** `setCellItem(col, row, item)` does not call `item.setCell(cell)`, does not clear the old item's back-reference, does not detach a moved item from its previous cell. `GridItem.cell` is stale or null.

**Fix:** Maintain both sides of the relationship in `setCellItem`.

---

### 8. Grid teardown leaks Three.js GPU resources

**Location:** `src/modules/gamegrid/src/views/GridsView.three.ts:29-35`

**Problem:** `removeGrid()` calls `removeFromParent()` but no `geometry.dispose()` or `material.dispose()`. Repeated board create/remove leaks GPU memory.

**Fix:** Recursively traverse removed objects and call `dispose()` on geometries, materials, and textures.

---

### 9. Settings popup never reflects manager-driven changes

**Location:** `src/modules/settings/src/controllers/SettingsPopupViewController.ts`

**Problem:** The controller does not subscribe to `SettingsEvents.onValueChanged`. The view's `updateFieldValue()` is never called. If `resetToDefaults()` or external code changes a setting, the popup UI stays stale.

**Fix:** Subscribe to `onValueChanged` in `initialize()`, call `view.updateFieldValue(name, value)`.

---

### 10. KeyboardListener: keys stuck after focus loss

**Location:** `src/core/input/KeyboardListener.ts`

**Problem:** No `blur` or `visibilitychange` handler. Keys held during alt-tab stay "down" forever after returning.

**Fix:** Add `window.addEventListener("blur", () => clearAllKeys())` and `visibilitychange` handler.

---

### 11. Generic views have no resize lifecycle

**Location:** `src/core/views/ViewFactory.ts:108-114`

**Problem:** `ViewFactory.resize()` only resizes the active screen and popups. Non-screen/popup views registered via `register()` are never notified. Consumers must manually forward resize — framework leakage.

**Fix:** Maintain a list of active views and propagate resize to all. Standardize on `onResize(w, h, dpr)` from `IView`.

---

## Low — Missing Coverage

### 12. No tests for AssetManager, ViewFactory, InputManager, or modules

**Problem:** Core framework classes have zero test coverage. Most depend on Three.js, PixiJS, or browser APIs.

**Fix:** Extract pure logic into testable units. Use happy-dom for DOM testing.

---

### 13. No integration test for module registration collisions

**Problem:** No smoke test verifying DI tokens don't collide across modules.

---

## Architectural Concerns

### A1. Module API is not lifecycle-aware — framework leakage

**Problem:** Modules like `GameCameraBinding` only bind a manager. Apps must manually call `initialize()`, `resize()`, `update()` from app hooks. Not a reusable module boundary.

**Fix idea:** `ModuleBinding` could have optional `onInitialize(app)`, `onResize(w, h, dpr)`, `onUpdate(dt)` methods called automatically by `GamelabsApp`.

---

### A2. `bindInstance()` vs `bindSingleton()` inject() asymmetry

**Problem:** `bindSingleton` triggers `IInjectionTarget.inject()` automatically. `bindInstance` does not. This asymmetry broke SettingsManager (fixed) and will affect any future `IInjectionTarget` registered via `bindInstance`.

**Fix idea:** `bindInstance` should also check `_isInjectionTarget` and call `inject()` at binding time.

---

## Previously Resolved

- ~~DIContainer inject() failure caches broken instance~~ — FIXED: hasInstance set after inject succeeds.
- ~~SettingsManager inject() never called~~ — FIXED: manual inject + rehydrate. Later refactored to SettingsModel/SettingsManager split.
- ~~UnsubscribeBag swallows errors~~ — FIXED: optional onError callback.
- ~~AudioService stopMusic() fade leak~~ — FIXED: stored timeout, cancel ramp, _clearFadeOut.
- ~~AudioService _applyVolumes() ignored during ramps~~ — FIXED: cancelScheduledValues + setValueAtTime.
- ~~GamelabsApp partial init unrecoverable~~ — FIXED: _initFailed flag, fail-fast.
- ~~SettingsManager addField before inject~~ — FIXED: _rehydrateFields after inject.
- ~~OnScreenControlsView preDestroy leak~~ — FIXED: destroy({ children: true }).
- ~~145 any type warnings~~ — FIXED: 0 warnings, justified suppressions documented.
- ~~DspEffect non-null assertions~~ — FIXED: explicit null guard with error message.
- ~~StorageService remove/clear/has try/catch~~ — FIXED: consistent error handling.
- ~~AudioService double-init guard~~ — FIXED: throws on second call.
- ~~10 ESLint errors~~ — FIXED: all resolved.
- ~~Avoidance example missing README~~ — FIXED.
- ~~No double-initialize guard~~ — FIXED.
- ~~PopupView blocker invisible~~ — FIXED: redraws on layout event.
- ~~SettingsPopupView panel background invisible~~ — FIXED: layout event on panel instead of rAF.
- ~~InputManager ignores HUD hit-testing~~ — FIXED: `_isHudEvent` checks Pixi hitTest before dispatching to world handlers. PopupView blocker removed from layout system to preserve drawn hit area. Visible UI backgrounds set to `eventMode: "static"`.

---

## Summary Table

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| 1 | High | DI alias can hijack primary token | DIContainer.ts:74-84 |
| 2 | High | InputManager loses pointer release outside canvas | InputManager.ts:74-89 |
| 3 | High | OnScreenControlManager.removeControl leaves keys latched | OnScreenControlManager.ts:38-42 |
| 4 | High | Duplicate grid IDs corrupt view/model | GridsModel.ts:21-24 |
| 5 | High | Camera mode switching discards computed position | GameCameraManager.ts:142-144 |
| 6 | Medium | Grid.setCellItem doesn't maintain back-references | Grid.ts:78-83 |
| 7 | Medium | Grid teardown leaks GPU resources | GridsView.three.ts:29-35 |
| 8 | Medium | Settings popup ignores manager-driven changes | SettingsPopupViewController.ts |
| 9 | Medium | KeyboardListener keys stuck after focus loss | KeyboardListener.ts |
| 10 | Medium | Generic views have no resize lifecycle | ViewFactory.ts:108-114 |
| 11 | Low | No tests for core/modules | — |
| 12 | Low | No module collision smoke test | — |
| A1 | Arch | Module API not lifecycle-aware | GameCameraBinding + app hooks |
| A2 | Arch | bindInstance vs bindSingleton inject asymmetry | DIContainer.ts |
