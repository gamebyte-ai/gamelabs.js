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
   * If true, Three.js and PixiJS will render into the SAME WebGL context/canvas.
   * This enables perfectly synchronized 3D + 2D compositing in one render pass order (Three → Pixi).
   *
   * Defaults to false to preserve the legacy "two canvas layers" setup.
   */
  sharedContext?: boolean;

  /**
   * Future-facing configuration buckets.
   * These are intentionally loose for now — you'll tighten them as features land.
   */
  pixi?: Record<string, unknown>;
  three?: Record<string, unknown>;
};
