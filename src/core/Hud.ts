import * as PIXI from "pixi.js";

type Create2DAppOptions = Partial<PIXI.ApplicationOptions>;

async function create2DApp(options: Create2DAppOptions = {}): Promise<PIXI.Application> {
  const app = new PIXI.Application();
  await app.init(options);
  return app;
}

export type HudCreateOptions = {
  /**
   * CSS class name applied to the Pixi canvas.
   * Defaults to "layer ui2d" (matches the examples).
   */
  canvasClassName?: string;

  /**
   * Options passed through to Pixi Application init.
   * Defaults to `{ backgroundAlpha: 0, antialias: true }`.
   */
  pixiOptions?: Create2DAppOptions;
};

/**
 * HUD system helper.
 * Owns a Pixi Application and its canvas mounting lifecycle.
 */
export class Hud {
  readonly app: PIXI.Application;

  private constructor(app: PIXI.Application) {
    this.app = app;
  }

  static async create(mount: HTMLElement, options: HudCreateOptions = {}): Promise<Hud> {
    const app = await create2DApp(options.pixiOptions ?? { backgroundAlpha: 0, antialias: true });

    app.canvas.className = options.canvasClassName ?? "layer ui2d";
    mount.appendChild(app.canvas);

    return new Hud(app);
  }

  resize(width: number, height: number): void {
    this.app.renderer.resize(width, height);
  }

  destroy(): void {
    this.app.destroy(true, { children: true, texture: true, textureSource: true });
    this.app.canvas.remove();
  }
}

