import * as PIXI from "pixi.js";
import { ScreenView } from "@gamebyte/gamelabsjs";
import type { IGameScreenView } from "./IGameScreenView";

/**
 * Empty HUD screen for the bubble shooter scaffold. Defines bounds via a
 * fully transparent overlay so future HUD widgets have a layout anchor; no
 * input is captured yet.
 */
export class GameScreenView extends ScreenView implements IGameScreenView {
  private readonly _overlay = new PIXI.Graphics();

  public override postInitialize(): void {
    super.postInitialize();
    this._overlay.layout = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" };
    this.addChild(this._overlay);
  }

  public override onResize(width: number, height: number, dpr: number): void {
    super.onResize(width, height, dpr);
    this.layout = {
      width: Math.max(1, width),
      height: Math.max(1, height),
      flexDirection: "column",
      justifyContent: "flex-start",
      padding: 16,
      gap: 12,
    };
    this._overlay.clear();
    this._overlay.rect(0, 0, Math.max(1, width), Math.max(1, height)).fill({ color: 0x000000, alpha: 0 });
  }
}
