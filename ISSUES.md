# Known Issues & Technical Debt

Last updated: April 2026 (after full framework review with Codex).

Total: **26 active issues** (2 Critical, 7 High, 10 Medium, 7 Low) + **2 resolved**.

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

**Impact:** Any service depending on `inject()` for setup will be silently broken. Failure surfaces as downstream bugs, not at the injection site.

**Fix options:**
- Move `hasInstance = true` AFTER `inject()` succeeds
- Wrap inject in try/catch, log the error, but still cache (explicit decision)
- Remove instance from cache if inject fails, let next call retry

**Test reference:** `tests/DIContainer.test.ts` — "should cache instance even if inject() throws"

---

### 2. SettingsManager is completely non-functional — inject() is never called

**Location:** `src/modules/settings/src/SettingsBinding.ts:31` + `src/core/di/DIContainer.ts:93`

**Problem:** `SettingsBinding` uses `bindInstance(SettingsManager, this._manager)`. `DIContainer.getInstance()` at line 93 has this code path for `bindInstance`:

```ts
if (provider.kind === "instance") return provider.value;
```

Unlike the `bindSingleton` path (line 109-111), `bindInstance` returns the instance immediately without invoking `IInjectionTarget.inject()`. No code manually calls `this._manager.inject(diContainer)`, so `_storage` and `_events` stay `null` forever.

**Downstream effects:**
- `setBooleanValue` / `setNumberValue` → `this._storage?.save(...)` is a no-op → **values never persist**
- Change events → `this._events?.emitValueChanged(...)` is a no-op → **UI never updates**
- `addField` → `this._storage?.load(...)` returns undefined → **persisted values never loaded**

**Impact:** Entire Settings module is broken. Users change settings, see no effect, restart to find all changes lost.

**Fix:** In `SettingsBinding.configureDI()`, manually inject after binding. Or use `bindSingleton(SettingsManager, () => this._manager)` to trigger auto-inject.

---

## High — Silent Errors, Resource Leaks, Broken Subsystems

### 3. UnsubscribeBag: flush swallows all errors silently

**Location:** `src/core/events/subscriptions.ts:23-29`

**Problem:** The `catch` block in `flush()` is completely empty. Cleanup bugs (double-dispose, use-after-destroy) never surface.

**Fix:** Accept optional `onError` callback, or log to console.warn in dev mode.

---

### 4. AudioService: `stopMusic()` fade leaves stale gain ramp and uncancelled setTimeout

**Location:** `src/core/services/AudioService.ts:179-193` (formerly `AudioManager`)

**Problem:** `stopMusic({ fadeOutMs: 500 })` schedules `linearRampToValueAtTime(0, ...)` and a `setTimeout` to call `source.stop()`, then immediately nulls `_musicSource`. If `playMusic()` is called during the fade window, the new fade-in ramp fights the pending ramp to 0. If `destroy()` is called during fade, the setTimeout is leaked.

**Fix:** Track timeout ID, clear in `_stopMusicImmediate()` and `destroy()`. Cancel scheduled values on the gain param before scheduling new ramps.

---

### 5. DI aliasing can silently hijack an already-bound primary token

**Location:** `src/core/di/DIContainer.ts:68-78` + `:82`

**Problem:** `bindAliases()` only checks `aliasToPrimary.get(alias)` for conflicts with other aliases, but does NOT check `providers.has(alias)`. So a later binding can add an alias that happens to be an already-bound primary token. Then `getInstance()` at line 82 checks `aliasToPrimary` FIRST, so the original primary's value is hijacked.

```ts
container.bindInstance(TokenA, "valueA");
container.bindInstance(TokenB, "valueB", [TokenA]); // should throw but doesn't
container.getInstance(TokenA); // returns "valueB" instead of "valueA"
```

**Impact:** Silent type confusion. Hard-to-diagnose bugs where a service returns the wrong instance.

**Fix:** In `bindAliases()`, reject aliases that are already primary tokens: `if (this.providers.has(alias)) throw ...`.

---

### 6. InputManager ignores HUD hit-testing entirely

**Location:** `src/core/input/InputManager.ts:11-23` + `:44-58`

**Problem:** `_hud` is stored in the constructor but never consulted in any pointer event handler. In shared-canvas mode, pointer events on a PIXI popup/button are ALSO resolved against the 3D scene via raycast. World objects fire even when the click was on a UI element that should have blocked it.

**Impact:** Buttons over 3D interactive objects double-fire. UI does not occlude world input.

**Fix:** In pointer handlers, query `_hud` to check if the point hit any interactive HUD object before running world raycast.

---

### 7. InputManager loses pointer release outside canvas

**Location:** `src/core/input/InputManager.ts:72-79`

**Problem:** All listeners are attached to `_canvas`. No `setPointerCapture()`, no window-level fallback. If the user presses down on the canvas and drags out, `pointerup` fires on the target element (window, body, etc.), not the canvas. Drag/press state sticks forever.

**Fix:** Call `event.target.setPointerCapture(event.pointerId)` on pointerdown, or add window-level pointerup/pointercancel fallback listeners.

---

### 8. OnScreenControlManager.removeControl() leaves virtual keys latched

**Location:** `src/modules/onscreencontrols/src/utilities/OnScreenControlManager.ts:34-38`

**Problem:** `removeControl()` deletes the config and emits the removal event, but never releases pressed button keys or joystick direction keys already in `_keysDown`. A button removed while pressed stays "pressed" forever. A joystick removed while tilted leaves `${id}.left`/`right`/`up`/`down` in `_keysDown` indefinitely.

**Impact:** Game input state becomes permanently "pressed" for removed controls. Subscribers never get release events.

**Fix:** In `removeControl()`, iterate pressed keys associated with the control and call `setButtonUp()` / `_updateVirtualKey(code, false)` before deletion.

---

### 9. Duplicate grid IDs corrupt view/model

**Location:** `src/modules/gamegrid/src/models/GridsModel.ts:20-23` + `src/modules/gamegrid/src/views/GridsView.three.ts:23-27`

**Problem:** `GridsModel.addGrid()` overwrites the existing map entry without removal. `GridsView.addGrid()` overwrites its map entry and calls `this.add(gridObj)` — adding a new 3D object without removing the previous one. Old `GridObject` remains in the scene, unreachable from the map, never disposed.

**Fix:** Reject duplicate IDs (throw) or call `removeGrid(id)` first.

---

### 10. Camera mode switching discards computed position

**Location:** `src/modules/gamecamera/src/GameCameraManager.ts:118-161`

**Problem:** `_ensureCameraForController()` computes a smart `_currentPosition` for ortho↔perspective transitions (lines 130-135 for ortho, 146-149 for perspective). Then at lines 152-154:

```ts
if (existing && this._camera !== existing) {
  this._currentPosition.copy(existing.position);  // ← overwrites everything
}
```

The careful computation is always overwritten with the OLD camera's position. Plus, the ortho branch uses a hardcoded `PERSPECTIVE_TO_ORTHO_OFFSET = 5` for every controller type regardless of camera scale.

**Impact:** Camera visibly jumps to wrong position when switching modes.

**Fix:** Remove the unconditional overwrite at line 152-154, or make it a fallback only when the smart path didn't fire.

---

## Medium — Correctness, Robustness, Lifecycle Gaps

### 11. AudioService: no guard against `setVolume()` during active gain ramp

**Location:** `src/core/services/AudioService.ts:305-319` — **FIXED**, leaving for context

See resolved section below. This was Issue #5 in the previous ISSUES.md.

---

### 12. GamelabsApp: `initialize()` leaves unrecoverable state on partial failure

**Location:** `src/core/GamelabsApp.ts:159-223`

**Problem:** `_isInitialized = true` is set at the end of `initialize()`. If any step after the first `bindInstance` throws, `_isInitialized` stays false but DI bindings persist. A retry will fail at the first bindInstance with "already bound".

**Fix:** Wrap body in try/catch with rollback, or set `_isInitialized = true` at start with a separate `_initComplete` flag.

---

### 13. SettingsManager: `addField()` before inject() skips persistence

**Location:** `src/modules/settings/src/utilities/SettingsManager.ts:28-38`

**Problem:** `addField()` reads from `this._storage?.load(field.name)`. Before inject (always, given #2), `_storage` is null, so `stored` is undefined, validation rejects, field gets default. Even when inject() runs later, existing fields are not re-hydrated.

**Fix:** After setting `_storage` in `inject()`, iterate `_fields` and re-load values.

---

### 14. Grid.setCellItem() doesn't maintain item↔cell back-references

**Location:** `src/modules/gamegrid/src/models/Grid.ts:77-82` + `src/modules/gamegrid/src/models/GridItem.ts:20-22`

**Problem:** `Grid.setCellItem(col, row, item)`:
- Does NOT call `item.setCell(cell)` — new item's back-reference stays null
- Does NOT clear the OLD item's back-reference
- Does NOT detach the moved item from its previous cell

`GridItem.cell` is stale or null by construction. Any consumer reading `item.cell` sees incorrect state.

**Fix:** Maintain both sides of the relationship in `setCellItem`.

---

### 15. Grid teardown leaks Three.js GPU resources

**Location:** `src/modules/gamegrid/src/views/GridsView.three.ts:29-35`, `GridCellObject.ts:84-94`, `GridItemObject.ts:49-55`

**Problem:** `removeGrid()` only calls `removeFromParent()` — no `geometry.dispose()` or `material.dispose()`. `GridCellObject.createVisual()` creates a new `BoxGeometry` and `MeshStandardMaterial` per cell; none are disposed. Repeated board create/remove leaks GPU memory.

**Fix:** Recursively traverse removed objects and call `dispose()` on geometries, materials, and textures.

---

### 16. Settings popup never reflects manager-driven changes

**Location:** `src/modules/settings/src/controllers/SettingsPopupViewController.ts:16-19` + `src/modules/settings/src/views/ISettingsPopupView.ts:8`

**Problem:** The controller's `inject()` gets `SettingsManager` and `UIEvents` but NOT `SettingsEvents`. It never subscribes to `onValueChanged`. `updateFieldValue()` is declared in the view interface but never called. If `resetToDefaults()` is invoked or any external code changes a setting, the popup UI stays stale until re-opened.

**Fix:** Inject `SettingsEvents`, subscribe to `onValueChanged` in `initialize()`, call `view.updateFieldValue(name, value)` in the handler.

---

### 17. OnScreenControlsView: `preDestroy()` does not destroy child PIXI containers

**Location:** `src/modules/onscreencontrols/src/views/OnScreenControlsView.pixi.ts:274-279`

**Problem:** `preDestroy()` clears tracking arrays but does not call `destroy({ children: true })` on buttons/joysticks. `HudViewBase.destroy()` calls `super.destroy()` (PIXI) without options — children are NOT destroyed by default.

**Fix:** In `preDestroy()`, iterate buttons and joysticks and destroy each with `{ children: true }`.

---

### 18. KeyboardListener: keys stuck "down" after focus loss

**Location:** `src/core/input/KeyboardListener.ts:20-38` + `:77-92`

**Problem:** State is only cleared in `stopListening()`. No `blur` or `visibilitychange` handler. Classic scenario: hold W, alt-tab away, release W, alt-tab back → W stays "down" forever, game input broken.

**Fix:** Add `window.addEventListener("blur", () => this._clearAllKeys())` and `document.addEventListener("visibilitychange", ...)`.

---

### 19. Generic views have no resize lifecycle

**Location:** `src/core/views/ViewFactory.ts:102-108` + `src/modules/onscreencontrols/src/views/IOnScreenControlsView.ts:5-6`

**Problem:** `ViewFactory.resize()` only calls `_activeScreen.onResize()` and popups. Non-screen/popup views registered via `register()` are never notified. Worse, `IOnScreenControlsView` declares a nonstandard `resize(width, height)` method (not `onResize`) that the factory would never call anyway. Consumers must manually forward resize in their parent screen's `onResize` — framework leakage.

**Fix:** Propagate resize to all active views (maintain registered view list). Standardize on `onResize(w, h, dpr)` from `IView`.

---

### 20. Widespread `any` usage — 145 warnings

**Locations:** Across `src/core/di/`, `src/core/assets/`, `src/modules/uicomponents/`, and new modules

**Problem:** 145 ESLint `@typescript-eslint/no-explicit-any` warnings. Many are `(this as any).layout` patterns and DI generic escapes.

**Impact:** Reduces type safety at module boundaries.

---

## Low — Missing Coverage, Consistency, Minor Bugs

### 21. No tests for AssetManager, ViewFactory, InputManager, or any new modules

**Problem:** Core framework classes handling asset loading, view lifecycle, and input routing have zero test coverage. None of the recently added modules (AudioService, StorageService, KeyboardListener, InputMapper, OnScreenControlManager, SettingsManager, DspChain) have tests.

**Fix:** Extract pure logic into testable units. Use happy-dom for lightweight DOM testing.

---

### 22. No integration test for module registration collisions

**Problem:** No smoke test that imports every module and verifies DI tokens don't collide.

---

### 23. DspEffect: `input`/`output` getters use non-null assertion without guard

**Location:** `src/modules/audiodsp/src/effects/DspEffect.ts:26-33`

**Problem:** Getters use `return this._input!`. If accessed before `init()` or after `destroy()`, they return null typed as `AudioNode`, causing NPE at call site.

**Fix:** Add explicit null checks with clear error messages.

---

### 24. StorageService: `remove()`, `clear()`, and `has()` missing try/catch

**Location:** `src/core/services/StorageService.ts:32-50`

**Problem:** `save()` and `load()` wrap localStorage access in try/catch. `remove()`, `clear()`, and `has()` do NOT. Inconsistent error handling — in restricted/private contexts, `has()` can throw at the call site while `load()` silently returns null.

**Fix:** Wrap all localStorage access in try/catch consistently.

---

### 25. AudioService.initialize() has no double-call guard

**Location:** `src/core/services/AudioService.ts:60-79`

**Problem:** Calling `initialize()` twice creates a new `AudioContext`, new gain nodes, and adds a second `visibilitychange` listener without removing the old ones. GamelabsApp only calls it once, but the public API has no protection.

---

### 26. Stale package-lock.json references

**Location:** `examples/helloworld/package-lock.json:19`, `examples/screens/package-lock.json:19` (others may exist)

**Problem:** Still contain `"name": "gamelabsjs"` references. Functionally harmless; fixed by running `npm install` in each directory.

---

## Architectural Concerns (not bugs, but design smells)

### A1. Module API is not lifecycle-aware — framework leakage

**Problem:** `GameCameraBinding` only binds a manager. Apps still have to manually call `initialize()`, `resize()`, and `update()` from their app hooks (`postInitialize`, `onResize`, `onStep`). This is not a reusable module boundary — it requires app authors to know the module's internal lifecycle.

**Location:** `src/modules/gamecamera/src/GameCameraBinding.ts` + example usage in `GamelabsApp` subclasses.

**Fix idea:** Modules should be able to register lifecycle hooks with the app. `ModuleBinding` could have optional `onInitialize(app)`, `onResize(w, h, dpr)`, `onUpdate(dt)` methods that `GamelabsApp` calls automatically.

---

### A2. `bindInstance()` vs `bindSingleton()` have different lifecycle semantics

**Problem:** Singletons via factory trigger `IInjectionTarget.inject()` automatically (DIContainer.ts:109). Prebuilt instances via `bindInstance` do NOT. This asymmetry already broke SettingsManager (see Issue #2) and will break any future `IInjectionTarget` registered as a prebuilt instance.

**Fix idea:** `bindInstance` should also check `_isInjectionTarget(instance)` and call `inject()` at binding time (or first resolution).

---

## Previously Listed — Now Resolved

- ~~**Avoidance example missing README**~~ — FIXED: `examples/avoidance/README.md` exists.
- ~~**No lifecycle guard against double `initialize()`**~~ — FIXED: `GamelabsApp.ts:160` now has `if (this._isInitialized) return;` (see Issue #12 for corner case).
- ~~**AudioService `_applyVolumes()` ignored during active ramps**~~ — FIXED at `src/core/services/AudioService.ts:305-319`. Now calls `cancelScheduledValues(t)` + `setValueAtTime(value, t)` on each gain param.
- ~~**10 ESLint errors, 6 auto-fixable**~~ — FIXED: `npm run lint` now passes clean. Previously documented `no-useless-assignment` and `consistent-type-imports` errors have been resolved.

---

## Summary Table

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| 1 | Critical | DIContainer inject() failure caches broken instance | DIContainer.ts:102-116 |
| 2 | Critical | SettingsManager.inject() never called — module broken | SettingsBinding.ts:31 |
| 3 | High | UnsubscribeBag swallows errors silently | subscriptions.ts:23-29 |
| 4 | High | AudioService stopMusic() fade leaks ramp + timeout | AudioService.ts:179-193 |
| 5 | High | DI alias can hijack already-bound primary token | DIContainer.ts:68,82 |
| 6 | High | InputManager ignores HUD hit-testing | InputManager.ts:44-58 |
| 7 | High | InputManager loses pointer release outside canvas | InputManager.ts:72-79 |
| 8 | High | OnScreenControlManager.removeControl leaves keys latched | OnScreenControlManager.ts:34-38 |
| 9 | High | Duplicate grid IDs corrupt view/model | GridsModel.ts:20, GridsView.three.ts:23 |
| 10 | High | Camera mode switching discards computed position | GameCameraManager.ts:118-161 |
| 11 | Medium | (reserved — previously AudioService ramp, now fixed) | — |
| 12 | Medium | GamelabsApp partial init leaves unrecoverable state | GamelabsApp.ts:159-223 |
| 13 | Medium | SettingsManager addField before inject skips persistence | SettingsManager.ts:28-38 |
| 14 | Medium | Grid.setCellItem doesn't maintain back-references | Grid.ts:77, GridItem.ts:20 |
| 15 | Medium | Grid teardown leaks Three.js GPU resources | GridsView.three.ts:29-35 |
| 16 | Medium | Settings popup never reflects manager-driven changes | SettingsPopupViewController.ts:16 |
| 17 | Medium | OnScreenControlsView preDestroy leaks child containers | OnScreenControlsView.pixi.ts:274-279 |
| 18 | Medium | KeyboardListener keys stuck after focus loss | KeyboardListener.ts:20-92 |
| 19 | Medium | Generic views have no resize lifecycle | ViewFactory.ts:102-108 |
| 20 | Medium | 145 `any` type warnings | Across src/ |
| 21 | Low | No tests for AssetManager, ViewFactory, InputManager, new modules | — |
| 22 | Low | No module collision smoke test | — |
| 23 | Low | DspEffect getters use non-null assertions | DspEffect.ts:26-33 |
| 24 | Low | StorageService remove/clear/has missing try/catch | StorageService.ts:32-50 |
| 25 | Low | AudioService.initialize() no double-call guard | AudioService.ts:60-79 |
| 26 | Low | Stale package-lock.json references | examples/*/package-lock.json |
| A1 | Arch | Module API not lifecycle-aware (framework leakage) | GameCameraBinding.ts + app hooks |
| A2 | Arch | bindInstance vs bindSingleton inject() asymmetry | DIContainer.ts:93,109 |
