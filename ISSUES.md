# Known Issues & Technical Debt

Last updated: April 2026 (re-evaluated after full refactor session).

Total: **3 active issues** (0 Critical, 0 High, 0 Medium, 2 Low, 1 Architectural).

---

## Low — Missing Coverage

### 1. No tests for AssetManager, ViewFactory, InputManager, or modules

**Problem:** Core framework classes have zero test coverage. Most depend on Three.js, PixiJS, or browser APIs.

**Fix:** Extract pure logic into testable units. Use happy-dom for DOM testing.

---

### 2. No integration test for module registration collisions

**Problem:** No smoke test verifying DI tokens don't collide across modules.

---

## Architectural Concerns

### A1. `bindInstance()` vs `bindSingleton()` inject() asymmetry

**Problem:** `bindSingleton` triggers `IInjectionTarget.inject()` automatically. `bindInstance` does not. This asymmetry broke SettingsManager (fixed) and will affect any future `IInjectionTarget` registered via `bindInstance`.

**Fix idea:** `bindInstance` should also check `_isInjectionTarget` and call `inject()` at binding time.

---

## Summary Table

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| 1 | Low | No tests for core/modules | — |
| 2 | Low | No module collision smoke test | — |
| A1 | Arch | bindInstance vs bindSingleton inject asymmetry | DIContainer.ts |
