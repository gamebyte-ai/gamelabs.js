import * as PIXI from "pixi.js";

export type Create2DAppOptions = Partial<PIXI.ApplicationOptions>;

/**
 * Creates a PixiJS Application.
 * This is intentionally small for now; you’ll grow this into your 2D runtime.
 */
export async function create2DApp(options: Create2DAppOptions = {}): Promise<PIXI.Application> {
  const app = new PIXI.Application();

  // Pixi v8+ uses async init().
  await app.init(options);
  return app;
}

