# Known Issues & Technical Debt

Last updated: April 2026 (re-evaluated after full refactor session).

Total: **7 active issues** (0 Critical, 0 High, 3 Medium, 2 Low, 2 Architectural).

---

## Medium — Correctness, Robustness, Lifecycle Gaps

### 1. Settings popup never reflects manager-driven changes

**Location:** `src/modules/settings/src/controllers/SettingsPopupViewController.ts`

**Problem:** The controller does not subscribe to `SettingsEvents.onValueChanged`. The view's `updateFieldValue()` is never called. If `resetToDefaults()` or external code changes a setting, the popup UI stays stale.

**Fix:** Subscribe to `onValueChanged` in `initialize()`, call `view.updateFieldValue(name, value)`.

---

### 2. KeyboardListener: keys stuck after focus loss

**Location:** `src/core/input/KeyboardListener.ts`

**Problem:** No `blur` or `visibilitychange` handler. Keys held during alt-tab stay "down" forever after returning.

**Fix:** Add `window.addEventListener("blur", () => clearAllKeys())` and `visibilitychange` handler.

---

### 3. Generic views have no resize lifecycle

**Location:** `src/core/views/ViewFactory.ts:108-114`

**Problem:** `ViewFactory.resize()` only resizes the active screen and popups. Non-screen/popup views registered via `register()` are never notified. Consumers must manually forward resize — framework leakage.

**Fix:** Maintain a list of active views and propagate resize to all. Standardize on `onResize(w, h, dpr)` from `IView`.

---

## Low — Missing Coverage

### 4. No tests for AssetManager, ViewFactory, InputManager, or modules

**Problem:** Core framework classes have zero test coverage. Most depend on Three.js, PixiJS, or browser APIs.

**Fix:** Extract pure logic into testable units. Use happy-dom for DOM testing.

---

### 5. No integration test for module registration collisions

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
| 1 | Medium | Settings popup ignores manager-driven changes | SettingsPopupViewController.ts |
| 2 | Medium | KeyboardListener keys stuck after focus loss | KeyboardListener.ts |
| 3 | Medium | Generic views have no resize lifecycle | ViewFactory.ts:108-114 |
| 4 | Low | No tests for core/modules | — |
| 5 | Low | No module collision smoke test | — |
| A1 | Arch | Module API not lifecycle-aware | GameCameraBinding + app hooks |
| A2 | Arch | bindInstance vs bindSingleton inject asymmetry | DIContainer.ts |
