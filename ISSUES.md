# Known Issues & Technical Debt

Last updated: April 2026 (revised after full code review against new modules).

---

## Critical — State Corruption & Broken Functionality

### 1. DIContainer: `inject()` failure caches broken instance

**Location:** `src/core/di/DIContainer.ts:102-116`

**Problem:** When a singleton factory succeeds but `inject()` throws, the instance is already cached (`hasInstance = true`, `provider.instance = created`). All subsequent `getInstance()` calls return the partially initialized instance silently — no retry, no error.

```ts
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

### 2. SettingsManager is completely non-functional — inject() is never called

**Location:** `src/modules/settings/src/SettingsBinding.ts:31` + `src/core/di/DIContainer.ts:93`

**Problem:** `SettingsBinding` uses `bindInstance(SettingsManager, this._manager)` to register the manager. `DIContainer.getInstance()` at line 93 has this code path for `bindInstance`:

```ts
if (provider.kind === "instance") return provider.value;
```

Unlike the `bindSingleton` path (which calls `inject()` at line 109-111), the `bindInstance` path returns the instance immediately without invoking `IInjectionTarget.inject()`. Since `SettingsManager.inject()` is only called from DIContainer's factory path, and no code manually calls `this._manager.inject(diContainer)`, the manager's `_storage` and `_events` fields remain `null` forever.

**Downstream effects:**
- `setBooleanValue` / `setNumberValue` call `this._storage?.save(...)` → no-op → **values never persist**
- Change events call `this._events?.emitValueChanged(...)` → no-op → **UI never updates on setting changes**
- `addField` calls `this._storage?.load(...)` → returns `undefined` → **persisted values never loaded, always default**

**Impact:** Entire Settings module is broken. Users will change settings, see no effect, and restart the game to find all changes lost.

**Fix:** In `SettingsBinding.configureDI()`, manually inject the manager after binding:
```ts
diContainer.bindInstance(SettingsManager, this._manager);
diContainer.bindInstance(SettingsEvents, this._events);
this._manager.inject(diContainer); // ← add this
```

Or use `bindSingleton(SettingsManager, () => this._manager)` which triggers inject automatically.

---

## High — Silent Error Swallowing & Resource Leaks

### 3. UnsubscribeBag: flush swallows all errors silently

**Location:** `src/core/events/subscriptions.ts:23-29`

**Problem:** The `catch` block in `flush()` is completely empty. If a cleanup callback throws (e.g., trying to remove a listener from a destroyed object), the error is silently swallowed. No logging, no error collection.

```ts
try {
  const unsub = list[i];
  if (unsub) unsub();
} catch {
  // Best-effort cleanup: keep flushing remaining callbacks.
}
```

**Impact:** Bugs in cleanup code (double-dispose, use-after-destroy) never surface. Developers see symptoms elsewhere and struggle to trace back to a failed unsubscribe.

**Fix:** Accept an optional `onError` callback in the constructor, or log to console.warn in dev mode.

---

### 4. AudioManager: `stopMusic()` fade leaves stale gain ramp and uncancelled setTimeout

**Location:** `src/core/services/AudioManager.ts:179-193`

**Problem:** `stopMusic({ fadeOutMs: 500 })` schedules a `linearRampToValueAtTime(0, ...)` on `_musicGain` (line 184) and a `setTimeout` to call `source.stop()` (line 185-187), then immediately nulls `_musicSource`.

If `playMusic()` is called during the fade-out window:
1. `_stopMusicImmediate()` at line 148 is a no-op because `_musicSource` is already null
2. New music source connects to the same `_musicGain` whose gain is ramping toward 0
3. The new `linearRampToValueAtTime(volume, ...)` fights the previous ramp to 0 — behavior is race-dependent

If `destroy()` is called during the fade window:
1. `_musicGain` is nulled at line 269
2. The pending `setTimeout` eventually fires and calls `source.stop()` — safe (in try/catch)
3. But the timeout reference was leaked

**Impact:** Music played during fade-out window can be silenced or volume-corrupted. setTimeout leak is minor but real.

**Fix:** Store the timeout ID, clear it in `_stopMusicImmediate()` and `destroy()`. Call `cancelScheduledValues(currentTime)` on the gain param before scheduling new ramps.

---

## Medium — Correctness & Robustness

### 5. AudioManager: `_applyVolumes()` is ignored during active gain ramps

**Location:** `src/core/services/AudioManager.ts:281-291`

**Problem:** `_applyVolumes()` sets `gain.value = ...` directly. Per Web Audio API spec, setting `.value` while there is an active automation event (from `linearRampToValueAtTime`) is ignored without error. During a music fade-in, any `setMusicVolume()` call will silently fail.

**Impact:** Volume slider changes during music fade-in are silently dropped. User sees slider move but hears no change until fade completes.

**Fix:** Call `cancelScheduledValues(currentTime)` before setting `.value`, or use `setValueAtTime(value, currentTime)`.

---

### 6. GamelabsApp: `initialize()` leaves unrecoverable state on partial failure

**Location:** `src/core/GamelabsApp.ts:159-223`

**Problem:** `_isInitialized = true` is set at the very end of `initialize()` (line 222). If any step after the first `bindInstance` call throws (e.g., `createHud()`, `AssetManager` construction, module `configureDI`, asset loading), `_isInitialized` stays false but DI bindings from the partial run persist.

A retry via `initialize()` will hit the guard at line 160 (no early return since `_isInitialized` is false) and immediately fail at line 166 with "Token IDevUtils is already bound".

**Impact:** After any initialization failure, the app is unrecoverable in-place. User must create a new app instance.

**Fix:** Wrap the body in try/catch; on failure, either roll back DI bindings or set a `_initFailed` flag that produces a meaningful error on retry.

---

### 7. SettingsManager: `addField()` called before inject() always returns default

**Location:** `src/modules/settings/src/utilities/SettingsManager.ts:28-38`

**Problem:** `addField()` reads from `this._storage?.load(field.name)` to initialize the value. If called before `inject()` (which is ALWAYS the case — see Issue #2), `_storage` is null, so `stored` is `undefined`. The validation check at line 33 rejects `undefined`, and the field gets its default value. Even when/if `inject()` is later called, existing fields are NOT re-hydrated from storage.

**Impact:** Compounds with Issue #2 — even if #2 is fixed by manually calling inject(), the fields added before that call will not have their persisted values loaded.

**Fix:** After setting `_storage` in `inject()`, iterate over existing `_fields` and re-load values from storage.

---

### 8. OnScreenControlsView: `preDestroy()` does not destroy child PIXI containers

**Location:** `src/modules/onscreencontrols/src/views/OnScreenControlsView.pixi.ts:274-279`

**Problem:** `preDestroy()` clears tracking arrays and listener sets but does not call `destroy({ children: true })` on individual button/joystick containers. `HudViewBase.destroy()` at line 107 calls `super.destroy()` (PIXI.Container.destroy) without options, which by default does NOT destroy children.

Child containers (`_buttons`, `_joysticks`) retain their pointer event listeners (`pointerdown`, `pointerup`, `globalpointermove`) and remain in memory until garbage collection.

**Impact:** Memory leak proportional to number of virtual controls. Stale event handlers may still fire if any external reference holds the container.

**Fix:** In `preDestroy()`, iterate over buttons and joysticks and call `container.destroy({ children: true })` on each.

---

### 9. Widespread `any` usage — 145 warnings (up from 129)

**Locations:** Across `src/core/di/`, `src/core/assets/`, `src/modules/uicomponents/`, and new modules (`src/modules/settings/`, `src/modules/onscreencontrols/`)

**Problem:** 145 ESLint `@typescript-eslint/no-explicit-any` warnings. The increase of 16 from 129 comes from the recent merge (AudioDsp, Settings, OnScreenControls modules). Many are `(this as any).layout` patterns and DI generic escapes.

**Impact:** Reduces type safety at module boundaries. DI container `Token<any>` is partially unavoidable, but UI component layout typing and new module code can be improved.

---

## Low — Missing Coverage, Consistency, Minor Bugs

### 10. No tests for AssetManager, ViewFactory, InputManager, or any new modules

**Problem:** Core framework classes that handle asset loading, view lifecycle, and input routing have zero test coverage. None of the recently added modules (AudioManager, StorageService, KeyboardListener, InputMapper, OnScreenControlManager, SettingsManager, DspChain) have tests either.

**Constraint:** Most depend on Three.js, PixiJS, or browser APIs (Web Audio, localStorage) at import time, making isolated testing harder.

**Fix options:**
- Extract pure logic into testable units
- Use vitest browser mode or happy-dom for lightweight DOM testing
- Mock module-level globals

---

### 11. No integration test for module registration collisions

**Problem:** No "smoke test app" that imports every module and verifies DI tokens don't collide. Two modules using the same InjectionToken description could silently conflict.

---

### 12. DspEffect: `input`/`output` getters use non-null assertion without guard

**Location:** `src/modules/audiodsp/src/effects/DspEffect.ts:26-33`

**Problem:** Getters use `return this._input!` and `return this._output!`. If accessed before `init()` or after `destroy()`, they return `null` typed as `AudioNode`, causing an NPE at the call site (e.g., `effect.input.connect(...)`).

**Impact:** Normal path via `DspChain.addEffect()` is safe because it calls `init()` first. Only problematic for direct instantiation or post-destroy access.

**Fix:** Add explicit null checks or throw with a clear "not initialized" message.

---

### 13. 10 ESLint errors — 6 auto-fixable

**Current counts:** 10 errors, 145 warnings.

**Breakdown:**
- 6 `@typescript-eslint/consistent-type-imports` errors in new merge files (`IInputDeviceListener.ts`, `InputMapper.ts`, `KeyboardListener.ts`, `DspChain.ts`, `SettingsManager.ts:5-6`) — **all auto-fixable with `eslint --fix`**
- 2 `no-useless-assignment` errors in `ImageComponent.pixi.ts:105-106` (pre-existing)
- 2 `no-useless-assignment` errors in `OnScreenControlTypes.ts:83-84` (new — same pattern)

**Fix:** Run `npm run lint:fix` for the 6 auto-fixable ones. Manually remove the dead `let x = 0` / `let y = 0` / `let scaleX = 1` / `let scaleY = 1` default initializations.

---

### 14. StorageService: `remove()` and `clear()` missing try/catch

**Location:** `src/core/services/StorageService.ts:31-43`

**Problem:** `save()` and `load()` wrap localStorage access in try/catch (for quota errors, private browsing, etc.) but `remove()` and `clear()` do not. Inconsistent error handling.

**Impact:** Low — `removeItem()` rarely throws, but inconsistency makes the API unpredictable in constrained environments.

---

### 15. AudioManager.initialize() has no double-call guard

**Location:** `src/core/services/AudioManager.ts:60-79`

**Problem:** Calling `initialize()` twice creates a new `AudioContext`, new gain nodes, and adds a second `visibilitychange` listener without removing the old ones. GamelabsApp only calls it once, but the public API has no protection.

**Impact:** Resource leak if called more than once. Currently not triggered by framework code.

---

### 16. package-lock.json files still reference old package name

**Location:** Root and all example `package-lock.json` files

**Problem:** Still contain `"name": "gamelabsjs"` references. Functionally harmless; fixed by running `npm install` in each directory.

---

## Previously Listed — Now Resolved

- ~~**Avoidance example missing README**~~ — FIXED: `examples/avoidance/README.md` now exists.
- ~~**No lifecycle guard against double `initialize()`**~~ — FIXED: `GamelabsApp.ts:160` now has `if (this._isInitialized) return;` guard (though see Issue #6 for a subtle corner case).

---

## Summary Table

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| 1 | Critical | DIContainer inject() failure caches broken instance | DIContainer.ts:102-116 |
| 2 | **Critical** | **SettingsManager.inject() never called — module broken** | **SettingsBinding.ts:31** |
| 3 | High | UnsubscribeBag swallows errors silently | subscriptions.ts:23-29 |
| 4 | High | AudioManager stopMusic() fade leaks ramp + timeout | AudioManager.ts:179-193 |
| 5 | Medium | AudioManager volume changes ignored during ramps | AudioManager.ts:281-291 |
| 6 | Medium | GamelabsApp partial init leaves unrecoverable state | GamelabsApp.ts:159-223 |
| 7 | Medium | SettingsManager addField before inject skips persistence | SettingsManager.ts:28-38 |
| 8 | Medium | OnScreenControlsView preDestroy leaks child containers | OnScreenControlsView.pixi.ts:274-279 |
| 9 | Medium | 145 `any` type warnings (up from 129) | Across src/ |
| 10 | Low | No tests for AssetManager, ViewFactory, InputManager, new modules | — |
| 11 | Low | No module collision smoke test | — |
| 12 | Low | DspEffect getters use non-null assertions | DspEffect.ts:26-33 |
| 13 | Low | 10 ESLint errors (6 auto-fixable) | ImageComponent.pixi.ts, OnScreenControlTypes.ts, new merge files |
| 14 | Low | StorageService remove()/clear() missing try/catch | StorageService.ts:31-43 |
| 15 | Low | AudioManager.initialize() no double-call guard | AudioManager.ts:60-79 |
| 16 | Low | Stale package-lock.json references | *.package-lock.json |
