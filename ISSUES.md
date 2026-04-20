# Known Issues & Technical Debt

Last updated: April 2026 (re-evaluated after full refactor session).

Total: **5 active issues** (0 Critical, 0 High, 1 Medium, 2 Low, 2 Architectural).

---

## Medium — Correctness, Robustness, Lifecycle Gaps

### 1. Generic views have no resize lifecycle

**Location:** `src/core/views/ViewFactory.ts:108-114`

**Problem:** `ViewFactory.resize()` only resizes the active screen and popups. Non-screen/popup views registered via `register()` are never notified. Consumers must manually forward resize — framework leakage.

**Fix:** Maintain a list of active views and propagate resize to all. Standardize on `onResize(w, h, dpr)` from `IView`.

---

## Low — Missing Coverage

### 2. No tests for AssetManager, ViewFactory, InputManager, or modules

**Problem:** Core framework classes have zero test coverage. Most depend on Three.js, PixiJS, or browser APIs.

**Fix:** Extract pure logic into testable units. Use happy-dom for DOM testing.

---

### 3. No integration test for module registration collisions

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
| 1 | Medium | Generic views have no resize lifecycle | ViewFactory.ts:108-114 |
| 2 | Low | No tests for core/modules | — |
| 3 | Low | No module collision smoke test | — |
| A1 | Arch | Module API not lifecycle-aware | GameCameraBinding + app hooks |
| A2 | Arch | bindInstance vs bindSingleton inject asymmetry | DIContainer.ts |
