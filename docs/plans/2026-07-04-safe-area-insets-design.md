# Safe-Area Inset Awareness — Design

**Date:** 2026-07-04 · **Status:** LOCKED (Approach A, revised after DA gate) · **Owner:** sergey

## Concept (one sentence)

The framework reads safe-area insets from CSS (`var(--safe-area-inset-*)` with an
`env(safe-area-inset-*)` fallback), exposes them as app state (`IApp.safeAreaInsets`),
and edge-anchored OnScreenControls automatically respect them — while the 3D world
canvas stays full-bleed.

## Problem

`OnScreenControls` (joystick/buttons) pin to raw screen edges —
`resolveAnchorPosition` uses raw `screenWidth/Height` — so controls land under the
notch / home indicator on modern phones. Seen in production on 3rd-person games
(2D games with centered UI escape it). The host side is done (byte-2 PR #763):
insets are published as `--safe-area-inset-top/right/bottom/left` CSS custom
properties for both preview and merge.

## Decision (Approach A — chosen over alternatives)

- **A (chosen): IApp SSOT + automatic OSC.** App reads insets on every resize pass,
  exposes `IApp.safeAreaInsets`; OSC applies them automatically. Existing games are
  fixed with **zero code changes**. Matches the framework's stated philosophy
  ("read state from `IApp`, react via `AppEvents`").
- B (rejected): extend `onResize(w,h,dpr,insets)` across all view bases — every game
  must update call sites to benefit; churn without payoff.
- C (rejected): host shrinks the HUD canvas by insets — breaks canvas-size parity
  with the world layer (input mapping, letterbox math), cuts full-screen HUD art.
- `ignoreSafeArea` per-control flag: **deferred (YAGNI)** — addable to `ControlConfig`
  later, non-breaking. Instead, one app-level kill switch ships now:
  **`GamelabsAppConfig.safeArea?: boolean`** (default `true`; `false` ⇒ insets stay
  zero) — rollout insurance for games with hand-tuned offsets [DA-8].

## Data flow

```
CSS (host)                      GamelabsApp resize pass                Consumers
--safe-area-inset-* ──┐
                      ├─► probe <div>, four LONGHANDS:                 IApp.safeAreaInsets ◄── OnScreenControlsView
env(safe-area-inset-*)┘     padding-top: var(--safe-area-inset-top,    (logical px, frozen)     onResize override →
                              env(safe-area-inset-top, 0px)) …                                  _repositionAll (automatic)
                            │ getComputedStyle → raw CSS px
                            ▼                                                               ◄── HudViewBase/ScreenView
                        resolveCanvasSafeArea(...)  ── pure ──►  stored before world/hud        protected get safeAreaInsets
                        (bar clamp + logical scale)              resize + emitResize            (opt-in for game HUDs)
```

### New pieces

1. **`SafeAreaInsets`** — `{ top, right, bottom, left }`, all fields `readonly`;
   in `src/core/utilities/safeAreaInsets.ts`, exported from both entries. The app
   stores an `Object.freeze`d instance and **replaces** it wholesale each pass —
   consumers can't mutate the SSOT, and cached references are explicitly stale by
   contract ("read live from `IApp`") [DA-6].
2. **`readSafeAreaInsets(host: HTMLElement): SafeAreaInsets`** (DOM, thin):
   lazily creates one cached, hidden probe `<div>` inside the host element with
   **four separate longhand declarations** —
   `padding-top: var(--safe-area-inset-top, env(safe-area-inset-top, 0px))`, … —
   and reads the four computed longhands. Longhands isolate failure per edge: one
   malformed host var invalidates only its own edge, not all four (shorthand +
   `var()` is all-or-nothing under invalid-at-computed-value-time) [DA-3].
   One CSS expression per edge resolves the source chain (host var → env → 0) and
   the engine normalizes units/calc to px. Host contract: px-valued lengths.
   Probe: `position:fixed; width/height:0; visibility:hidden; pointer-events:none`,
   data-attribute-tagged, WeakMap-cached with reattach check (re-mount/HMR/host
   DOM-wipe safe). No DOM ⇒ zeros (SSR-safe).
3. **`resolveCanvasSafeArea(cssInsets, mountCssW, mountCssH, canvasCssRect, logicalW, logicalH)`**
   (pure, unit-tested): maps mount-relative CSS-px insets to canvas-relative
   logical-px — per-edge `max(0, inset − barSize)` then per-axis
   `logical / cssRect` scale, capped at the canvas dimension.
   **`canvasCssRect` is never measured** [DA-2]; it is derived analytically from the
   *same pass*: `fit:"contain"` ⇒ the playRect exactly as `_positionLayers` will
   write it as inline CSS px this pass; otherwise ⇒ the full measured mount
   (`.layer` CSS stretches the canvas). This stays consistent with actual layout in
   every combination — including fixed+contain, where `_positionLayers` writes
   fixed-logical values as CSS px (existing quirk; unit-tested here).
4. **`GamelabsApp`**: resolved insets stored on every resize pass **before**
   `world.resize` / `hud.resize` / `emitResize` (listeners see fresh state).
   Raw CSS insets are also kept; two extra triggers refresh insets that change
   *without* a mount resize [DA-1] — `screen.orientation.change` (180° flips swap
   left/right at identical w×h) and `visualViewport.resize` (URL-bar collapse,
   keyboard): the handler re-reads raw insets and runs the full resize pass only
   when they actually differ (no redundant canvas clears). Exposed via
   `get safeAreaInsets()`; added to `IApp`.
5. **`HudViewBase`**: `protected get safeAreaInsets(): SafeAreaInsets` (zeros when
   uninjected). Covers `ScreenView`, `PopupView`, and all HUD views.
   `WorldViewBase` gets **nothing** — 3D stays full-bleed by construction.
6. **OnScreenControls**:
   - `resolveAnchorPosition(anchor, offsetX, offsetY, w, h, insets?)` — edge axes
     shift inward (`left: insets.left + offsetX`, `bottom: h − insets.bottom − offsetY`,
     …); center axes unchanged.
   - `OnScreenControlsView` overrides `onResize(w,h,_dpr) → this.resize(w,h)` so
     repositioning rides the `HudViewBase` subscription it already inherits —
     "automatic" no longer depends on the game forwarding `resize()` (which stays,
     for compat; `_repositionAll` is idempotent) [DA-5].
   - `_repositionAll` passes `this.safeAreaInsets`; the **dynamic joystick area
     rect is clamped into the safe rect** so touches can't spawn in the
     home-indicator strip [DA-4a].
   - `OscJoystick`/`OscButton` handle `pointercancel` as release — fixes the
     pre-existing latched-input bug (character running forever after an iOS
     system-gesture cancel), which the unsafe strip made likely [DA-4b].

## Edge cases

| Case | Handling |
|---|---|
| Letterbox `fit:"contain"` | insets are mount-relative; per-edge bar clamp before scaling |
| Fixed `width/height` config | CSS px ≠ logical px; per-axis `logical / canvasCss` scale |
| Fixed **+** contain combined | canvasCssRect = playRect-as-CSS-px (matches `_positionLayers`); unit-tested |
| 180° orientation flip (same w×h) | `screen.orientation.change` → raw-inset diff → full pass [DA-1] |
| iOS URL-bar collapse / keyboard | `visualViewport.resize` → raw-inset diff check (no-op if unchanged) [DA-1] |
| No `mount` (canvas-only embed) | host = `canvas.parentElement`; if none → zeros |
| SSR / no `document` | zeros |
| iOS `env()` needs `viewport-fit=cover` | host responsibility — byte-2 PR #763 handles it |
| Desktop (no notch) | probe resolves to 0 everywhere → behavior identical to today |
| Hand-tuned offsets already compensating | one-time visual shift on notched devices — intended; `safeArea: false` kill switch if a game must opt out [DA-8] |

## Performance

One cached-probe `getComputedStyle` + 4 longhand reads per resize event; orientation/
visualViewport handlers do the same read and bail without inset change. No per-frame work.

## Test plan (vitest, node env — DOM reader stays thin & untested by design)

1. `resolveAnchorPosition`: all 9 anchors × zero/non-zero insets; center axes unaffected.
2. `resolveCanvasSafeArea`: identity (full-bleed), pillarbox/letterbox clamp (partial +
   full bar absorption), fixed-size scaling, **fixed+contain**, per-edge cap, zero insets.
3. Existing suites stay green.

## Compatibility

Additive API (`IApp.safeAreaInsets`, protected getter, optional param, config flag) —
with one caveat: downstream code *implementing or mocking* `IApp` gains a required
member (compile-time only; in-repo sole implementor is `GamelabsApp`) [DA-7].
Behavior changes: edge-anchored OSC controls shift inward on devices with non-zero
insets (the intended fix); `pointercancel` now releases OSC widgets (strictly a bug fix).

## DA gate résumé

Independent devil's-advocate review returned REVISE with 4 MAJOR / 4 MINOR findings;
all folded in above ([DA-n] markers). Notably: longhand probe declarations (DA-3),
analytic canvasCssRect (DA-2), orientation/visualViewport triggers (DA-1),
dynamic-area clamp + pointercancel (DA-4), frozen-replace semantics (DA-6),
OSC onResize override (DA-5), app-level kill switch (DA-8). Design re-locked after revision.
