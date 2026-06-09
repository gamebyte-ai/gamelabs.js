/**
 * Viewport fit configuration. Controls how the render surface (both the Three
 * World canvas and the Pixi HUD canvas) is sized within the mount element.
 *
 * Omitted entirely ⇒ `fit: "fill"` ⇒ the canvases fill the mount (legacy behavior).
 */
export interface ViewportConfig {
  /**
   * - `"fill"` (default): canvases fill the mount; no aspect constraint.
   * - `"contain"`: letterbox / pillarbox — the render surface is the largest
   *   rect of the target aspect that fits inside the mount, centered, with the
   *   surrounding mount area showing through as inert bars.
   * - `"cover"`: reserved; currently behaves like `"fill"` (crop-to-aspect is a
   *   content-level concern, not implemented at the canvas-sizing layer).
   */
  fit?: "fill" | "contain" | "cover";

  /**
   * Single fixed aspect ratio (width / height), e.g. `9 / 16` for portrait.
   * Shorthand for `minAspect === maxAspect === aspectRatio`.
   */
  aspectRatio?: number;

  /**
   * Lower bound of the allowed aspect band (width / height). When the available
   * area's aspect is inside `[minAspect, maxAspect]` the canvases fill it (no
   * bars); only outside the band does `"contain"` letterbox to the nearest edge.
   */
  minAspect?: number;

  /** Upper bound of the allowed aspect band (width / height). */
  maxAspect?: number;

  /**
   * Letterbox bar color. When set, applied to the mount element's background.
   * When omitted, the bars show whatever the host stylesheet gives the mount.
   */
  background?: string;
}

/** A logical-pixel rectangle: the play area within the mount. */
export interface ViewportRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Pure computation of the play-rect for a given available size and viewport
 * config. Logical pixels in, logical pixels out — no DOM access and no DPR
 * (device pixel ratio is applied downstream by the renderers). Safe to unit-test
 * headless.
 *
 * For `"contain"` the result is the largest rect of the clamped target aspect
 * that fits inside `availWidth × availHeight`, centered. For every other `fit`
 * (including the default) the result is the full available area at the origin.
 */
export function computeViewportRect(availWidth: number, availHeight: number, config?: ViewportConfig): ViewportRect {
  const W = Math.max(1, Math.floor(availWidth));
  const H = Math.max(1, Math.floor(availHeight));

  // Only "contain" constrains the surface; "fill" / "cover" use the full area.
  if (config?.fit !== "contain") {
    return { x: 0, y: 0, width: W, height: H };
  }

  const min = config.minAspect ?? config.aspectRatio;
  const max = config.maxAspect ?? config.aspectRatio;
  if (min == null || max == null || min <= 0 || max <= 0) {
    // contain requested but no aspect declared → nothing to constrain.
    return { x: 0, y: 0, width: W, height: H };
  }
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);

  const deviceAspect = W / H;
  const targetAspect = Math.min(Math.max(deviceAspect, lo), hi);

  let w: number;
  let h: number;
  if (deviceAspect > targetAspect) {
    // Window wider than target → pillarbox (bars left/right).
    h = H;
    w = Math.round(h * targetAspect);
  } else {
    // Window taller than (or equal to) target → letterbox (bars top/bottom).
    w = W;
    h = Math.round(w / targetAspect);
  }

  // Guard against rounding overshoot so the rect never exceeds the available area.
  w = Math.min(w, W);
  h = Math.min(h, H);

  return {
    x: Math.floor((W - w) / 2),
    y: Math.floor((H - h) / 2),
    width: w,
    height: h,
  };
}
