import * as PIXI from "pixi.js";
import { ScreenView } from "gamelabsjs";
import type { IGameScreenView } from "./IGameScreenView";

export class GameScreenView extends ScreenView implements IGameScreenView {
  private readonly _title = new PIXI.Text({
    text: "Example 03",
    style: {
      fill: 0xe8eef6,
      fontSize: 24,
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial"
    }
  });

  public postInitialize(): void {
    (this as any).layout = {
      width: 1,
      height: 1,
      flexDirection: "column",
      justifyContent: "flex-start",
      padding: 16,
      gap: 12
    };

    (this._title as any).layout = { width: "100%" };
    this.addChild(this._title);
  }

  override onResize(width: number, height: number, _dpr: number): void {
    (this as any).layout = { width: Math.max(1, width), height: Math.max(1, height) };
  }
}
