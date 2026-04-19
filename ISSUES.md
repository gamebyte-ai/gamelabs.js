# Known Issues & Technical Debt

Last updated: April 2026 (re-evaluated after full refactor session).

Total: **10 active issues** (0 Critical, 3 High, 3 Medium, 2 Low, 2 Architectural).

---

## High — Silent Errors, Resource Leaks, Broken Subsystems

### 1. InputManager loses pointer release outside canvas

**Location:** `src/core/input/InputManager.ts:74-89`

**Problem:** All listeners are on `_eventTarget`. No `setPointerCapture()`, no window-level fallback. If the user presses down and drags out, `pointerup` fires on the target element, not the event target. Drag/press state sticks.

**Fix:** Call `setPointerCapture(pointerId)` on pointerdown, or add window-level pointerup/pointercancel fallback.

---

### 2. OnScreenControlManager.removeControl() leaves virtual keys latched

**Location:** `src/modules/onscreencontrols/src/utilities/OnScreenControlManager.ts:38-42`

**Problem:** `removeControl()` deletes config and emits event but never releases pressed button keys or joystick direction keys in `_keysDown`. Removed-while-pressed controls stay "pressed" forever.

**Fix:** In `removeControl()`, release all pressed keys associated with the control before deletion.

---

### 3. Camera mode switching discards computed position

**Location:** `src/modules/gamecamera/src/utilities/GameCameraManager.ts:142-144`

**Problem:** `_ensureCameraForController()` computes a smart position for ortho/perspective transitions (lines 128-139), then unconditionally overwrites it with `this._currentPosition.copy(existing.position)`. Camera jumps on mode switch.

**Fix:** Remove the unconditional overwrite, or make it a fallback only when the smart path didn't fire.

---

## Medium — Correctness, Robustness, Lifecycle Gaps

### 4. Settings popup never reflects manager-driven changes

**Location:** `src/modules/settings/src/controllers/SettingsPopupViewController.ts`

**Problem:** The controller does not subscribe to `SettingsEvents.onValueChanged`. The view's `updateFieldValue()` is never called. If `resetToDefaults()` or external code changes a setting, the popup UI stays stale.

**Fix:** Subscribe to `onValueChanged` in `initialize()`, call `view.updateFieldValue(name, value)`.

---

### 5. KeyboardListener: keys stuck after focus loss

**Location:** `src/core/input/KeyboardListener.ts`

**Problem:** No `blur` or `visibilitychange` handler. Keys held during alt-tab stay "down" forever after returning.

**Fix:** Add `window.addEventListener("blur", () => clearAllKeys())` and `visibilitychange` handler.

---

### 6. Generic views have no resize lifecycle

**Location:** `src/core/views/ViewFactory.ts:108-114`

**Problem:** `ViewFactory.resize()` only resizes the active screen and popups. Non-screen/popup views registered via `register()` are never notified. Consumers must manually forward resize — framework leakage.

**Fix:** Maintain a list of active views and propagate resize to all. Standardize on `onResize(w, h, dpr)` from `IView`.

---

## Low — Missing Coverage

### 7. No tests for AssetManager, ViewFactory, InputManager, or modules

**Problem:** Core framework classes have zero test coverage. Most depend on Three.js, PixiJS, or browser APIs.

**Fix:** Extract pure logic into testable units. Use happy-dom for DOM testing.

---

### 8. No integration test for module registration collisions

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

## Summary Table

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| 1 | High | InputManager loses pointer release outside canvas | InputManager.ts:74-89 |
| 2 | High | OnScreenControlManager.removeControl leaves keys latched | OnScreenControlManager.ts:38-42 |
| 3 | High | Camera mode switching discards computed position | GameCameraManager.ts:142-144 |
| 4 | Medium | Settings popup ignores manager-driven changes | SettingsPopupViewController.ts |
| 5 | Medium | KeyboardListener keys stuck after focus loss | KeyboardListener.ts |
| 6 | Medium | Generic views have no resize lifecycle | ViewFactory.ts:108-114 |
| 7 | Low | No tests for core/modules | — |
| 8 | Low | No module collision smoke test | — |
| A1 | Arch | Module API not lifecycle-aware | GameCameraBinding + app hooks |
| A2 | Arch | bindInstance vs bindSingleton inject asymmetry | DIContainer.ts |
