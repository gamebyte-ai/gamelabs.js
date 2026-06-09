import type { ViewportConfig } from "./utilities/computeViewportRect.js";

export type WithCanvas = {
  /**
   * If omitted, the engine will create and manage a canvas.
   */
  canvas?: HTMLCanvasElement;
};

export type GamelabsAppConfig = WithCanvas & {
  /**
   * Optional mount element for measuring layout and/or attaching rendering layers.
   * If provided, `GamelabsApp` will use this element's bounding rect for resize measurements.
   */
  mount?: HTMLElement;

  /**
   * Optional size; if omitted and a canvas is provided, uses canvas client size.
   */
  width?: number;
  height?: number;

  /**
   * Optional viewport fit. Omitted ⇒ the canvases fill the mount (legacy behavior).
   * Set `{ fit: "contain", minAspect, maxAspect }` (or `aspectRatio`) to letterbox /
   * pillarbox a fixed-aspect (e.g. portrait) game so it never stretches to fill the window.
   */
  viewport?: ViewportConfig;
};
