import { create2DApp } from "gamelabsjs/2d";
import * as PIXI from "pixi.js";

/**
 * Example01 HUD system.
 * Owns the Pixi Application and canvas. UI widgets are views.
 */
export class Example01Hud {
  readonly app: PIXI.Application;

  private constructor(app: PIXI.Application) {
    this.app = app;
  }

  static async create(stageEl: HTMLElement): Promise<Example01Hud> {
    const app = await create2DApp({
      backgroundAlpha: 0,
      antialias: true
    });

    app.canvas.className = "layer ui2d";
    stageEl.appendChild(app.canvas);

    return new Example01Hud(app);
  }

  resize(width: number, height: number): void {
    this.app.renderer.resize(width, height);
  }

  destroy(): void {
    this.app.destroy(true, { children: true, texture: true, textureSource: true });
    this.app.canvas.remove();
  }
}

