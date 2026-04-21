import "@pixi/layout";
import * as PIXI from "pixi.js";
import type { IApp } from "../app/IApp.js";
import type { AppEvents } from "../app/AppEvents.js";
import { UnsubscribeBag } from "../events/subscriptions.js";

/**
 * Container whose `@pixi/layout` box tracks the app's canvas dimensions.
 *
 * Subscribes directly to `AppEvents.onResize` so its size stays in sync
 * with the canvas regardless of where it is attached in the display tree.
 * Useful as a layout root for HUD widgets that are created outside the
 * `ViewFactory` lifecycle (debug overlays, app-level content panels, etc.).
 */
export class FullscreenLayoutContainer extends PIXI.Container {
  private readonly _subs = new UnsubscribeBag();

  public constructor(app: IApp, appEvents: AppEvents) {
    super();
    this._applySize(app.width, app.height);
    this._subs.add(appEvents.onResize((w, h) => this._applySize(w, h)));
  }

  private _applySize(width: number, height: number): void {
    this.layout = { width: Math.max(1, width), height: Math.max(1, height) };
  }

  public override destroy(options?: PIXI.DestroyOptions): void {
    this._subs.flush();
    super.destroy(options);
  }
}
