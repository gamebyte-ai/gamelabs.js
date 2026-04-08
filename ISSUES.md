# Known Issues & Technical Debt

Discovered during codebase review, testing, and static analysis (April 2026).

---

## Critical — State Corruption

### 1. DIContainer: `inject()` failure caches broken instance

**Location:** `src/core/di/DIContainer.ts:102-116`

**Problem:** When a singleton factory succeeds but `inject()` throws, the instance is already cached (`hasInstance = true`, `provider.instance = created`). All subsequent `getInstance()` calls return the partially initialized instance silently — no retry, no error.

```ts
// Current code (simplified)
const created = provider.factory(this);
provider.instance = created;        // ← cached HERE
provider.hasInstance = true;         // ← marked as ready HERE

if (this._isInjectionTarget(created)) {
  created.inject(this);             // ← if this throws, instance is STILL cached
}
```

**Impact:** Any service depending on `inject()` for setup (event subscriptions, resolver references) will be silently broken. The failure only surfaces as downstream bugs, not at the injection site.

**Fix options:**
- **Option A:** Move `hasInstance = true` AFTER `inject()` succeeds — factory + inject retry on next call
- **Option B:** Wrap inject in try/catch, log the error, but still cache (explicit decision to tolerate partial init)
- **Option C:** Remove instance from cache if inject fails, let next call retry from scratch

**Test reference:** `tests/DIContainer.test.ts` — "should cache instance even if inject() throws"

---

## High — Silent Error Swallowing

### 2. UnsubscribeBag: flush swallows all errors silently

**Location:** `src/core/events/subscriptions.ts:23-29`

**Problem:** The `catch` block in `flush()` is completely empty. If a cleanup callback throws (e.g., trying to remove a listener from a destroyed object), the error is silently swallowed. This is intentional for resilience, but there is no diagnostic path — no logging, no error collection.

```ts
try {
  const unsub = list[i];
  if (unsub) unsub();
} catch {
  // Best-effort cleanup: keep flushing remaining callbacks.
  // ← No logging, no error collection
}
```

**Impact:** Bugs in cleanup code (double-dispose, use-after-destroy) will never surface. Developers will see symptoms elsewhere and struggle to trace back to a failed unsubscribe.

**Fix options:**
- Accept an optional `onError` callback in the constructor
- Log to console.warn in dev mode
- Collect errors and expose them after flush

---

## Medium — Code Quality (ESLint)

### 3. Useless assignment in ImageComponent

**Location:** `src/modules/uicomponents/src/ImageComponent.pixi.ts:105-106`

**Problem:** `scaleX` and `scaleY` variables are assigned but immediately overwritten. Flagged by ESLint `no-useless-assignment`.

```
105:9   error  The value assigned to 'scaleX' is not used in subsequent statements
106:9   error  The value assigned to 'scaleY' is not used in subsequent statements
```

**Impact:** Dead code; possible logic bug if the first assignment was intended to be used.

### 4. Widespread `any` usage — 129 warnings

**Locations:** Across `src/core/di/`, `src/core/assets/`, `src/modules/uicomponents/`

**Problem:** 129 ESLint `@typescript-eslint/no-explicit-any` warnings. Most are in DI container generics and UI component preset merging.

**Impact:** Reduces type safety at module boundaries. The DI container `Token<any>` usage is partially unavoidable due to type erasure, but UI component presets could benefit from stricter typing.

---

## Medium — Missing Coverage

### 5. No tests for AssetManager, ViewFactory, InputManager

**Problem:** Core framework classes that handle asset loading, view lifecycle, and input routing have zero test coverage. These are the most complex classes in the framework.

**Constraint:** AssetManager depends on Three.js and PixiJS at import time, making it hard to test without a browser or jsdom+WebGL mock. ViewFactory and InputManager have similar DOM/WebGL dependencies.

**Fix options:**
- Extract pure logic (URL validation, request deduplication, state tracking) into testable units
- Use vitest browser mode or happy-dom for lightweight DOM testing
- Mock Three.js/PixiJS loaders at module level for isolated tests

### 6. No integration test for module registration collisions

**Problem:** Todo.md P0 item — no "smoke test app" that imports every module and verifies DI tokens don't collide. Two modules using the same InjectionToken description could silently conflict.

---

## Low — Documentation / Consistency

### 7. Avoidance example missing README

**Location:** `examples/avoidance/`

**Problem:** Only example without a README.md. Not listed in root README.md examples table.

### 8. package-lock.json files still reference old package name

**Location:** Root and all example `package-lock.json` files

**Problem:** Still contain `"name": "gamelabsjs"` references. Functionally harmless but inconsistent. Fixed by running `npm install` in each directory.

### 9. No lifecycle guard against double `initialize()`

**Location:** `src/core/GamelabsApp.ts`

**Problem:** Todo.md P0 item — calling `initialize()` twice is undefined behavior. No guard or warning.

---

## Summary Table

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| 1 | Critical | inject() failure caches broken instance | DIContainer.ts:102-116 |
| 2 | High | flush() swallows errors silently | subscriptions.ts:23-29 |
| 3 | Medium | Useless scaleX/scaleY assignment | ImageComponent.pixi.ts:105-106 |
| 4 | Medium | 129 `any` type warnings | Across src/ |
| 5 | Medium | No tests for AssetManager, ViewFactory, InputManager | — |
| 6 | Medium | No module collision smoke test | — |
| 7 | Low | Avoidance example missing README | examples/avoidance/ |
| 8 | Low | Stale package-lock.json references | *.package-lock.json |
| 9 | Low | No double-initialize guard | GamelabsApp.ts |
