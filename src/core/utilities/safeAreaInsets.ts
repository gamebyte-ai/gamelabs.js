import type { ViewportRect } from "./computeViewportRect.js";

/**
 * Safe-area insets — the strips along each edge covered by device UI
 * (notch, home indicator, rounded corners). All-zero on devices and
 * hosts without any unsafe region.
 *
 * Instances are frozen and replaced wholesale when the app resizes:
 * read live from `IApp.safeAreaInsets` rather than caching a reference.
 */
export interface SafeAreaInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export const ZERO_SAFE_AREA_INSETS: SafeAreaInsets = Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 });

const PROBE_ATTRIBUTE = "data-gamelabsjs-safe-area-probe";
const EDGES = ["top", "right", "bottom", "left"] as const;

// One probe per host element, reused across resize passes. WeakMap so probes
// die with their hosts; the parent check recovers from a host DOM wipe.
const probeByHost = new WeakMap<HTMLElement, HTMLElement>();

function ensureProbe(host: HTMLElement): HTMLElement {
  const cached = probeByHost.get(host);
  if (cached && cached.parentElement === host) return cached;

  // Adopt a probe left behind by a previous module instance (HMR) instead of
  // stacking a new one next to it.
  const adopted = host.querySelector<HTMLElement>(`:scope > [${PROBE_ATTRIBUTE}]`);
  if (adopted) {
    probeByHost.set(host, adopted);
    return adopted;
  }

  const probe = document.createElement("div");
  probe.setAttribute(PROBE_ATTRIBUTE, "");
  probe.setAttribute("aria-hidden", "true");
  // Four longhands on purpose: a `padding` shorthand containing var() is
  // all-or-nothing under invalid-at-computed-value-time — one malformed host
  // variable would zero every edge instead of just its own.
  let css = "position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;";
  for (const edge of EDGES) {
    css += `padding-${edge}:var(--safe-area-inset-${edge},env(safe-area-inset-${edge},0px));`;
  }
  probe.style.cssText = css;
  host.appendChild(probe);
  probeByHost.set(host, probe);
  return probe;
}

/**
 * Reads the page's safe-area insets in CSS pixels.
 *
 * Source chain per edge: `--safe-area-inset-*` custom property (published by
 * the host page) → `env(safe-area-inset-*)` → `0px`. The chain resolves in
 * CSS via a hidden probe element's padding, so custom properties inherited
 * from any ancestor are honored and px-valued lengths (calc, rem, …) arrive
 * normalized to px. Host contract: publish px-valued lengths.
 *
 * Insets are relative to `host`'s layout context, i.e. the mount. Returns
 * zeros without a DOM (SSR).
 */
export function readSafeAreaInsets(host: HTMLElement): SafeAreaInsets {
  if (typeof window === "undefined" || typeof document === "undefined" || typeof window.getComputedStyle !== "function") {
    return ZERO_SAFE_AREA_INSETS;
  }
  const style = window.getComputedStyle(ensureProbe(host));
  return Object.freeze({
    top: parseFloat(style.paddingTop) || 0,
    right: parseFloat(style.paddingRight) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
    left: parseFloat(style.paddingLeft) || 0,
  });
}

/**
 * Maps mount-relative CSS-px insets to canvas-relative logical-px insets.
 *
 * `canvasCssRect` is the canvas's rect within the mount in CSS px, derived by
 * the caller from the current pass's play-rect — never measured, since a
 * measurement would reflect the previous pass's layout. Letterbox bars absorb
 * their share of an inset first; whatever overlaps the canvas is scaled into
 * logical space (fixed-size configs render logical px ≠ CSS px) and capped at
 * the canvas dimension. Pure — safe to unit-test headless.
 */
export function resolveCanvasSafeArea(
  cssInsets: SafeAreaInsets,
  mountCssWidth: number,
  mountCssHeight: number,
  canvasCssRect: ViewportRect,
  logicalWidth: number,
  logicalHeight: number,
): SafeAreaInsets {
  const { x, y, width, height } = canvasCssRect;
  if (width <= 0 || height <= 0) return ZERO_SAFE_AREA_INSETS;

  const scaleX = logicalWidth / width;
  const scaleY = logicalHeight / height;
  const clamp = (v: number, hi: number) => Math.min(Math.max(0, v), hi);

  return Object.freeze({
    top: clamp((cssInsets.top - Math.max(0, y)) * scaleY, logicalHeight),
    right: clamp((cssInsets.right - Math.max(0, mountCssWidth - x - width)) * scaleX, logicalWidth),
    bottom: clamp((cssInsets.bottom - Math.max(0, mountCssHeight - y - height)) * scaleY, logicalHeight),
    left: clamp((cssInsets.left - Math.max(0, x)) * scaleX, logicalWidth),
  });
}
