import * as PIXI from "pixi.js";
import { ScreenView } from "@gamebyte/gamelabsjs";
import type { IGameScreenView } from "./IGameScreenView.js";

/**
 * Lightweight PIXI overlay: top-left title and one-line instructions. No
 * interactive elements; gameplay input is handled by the world view.
 */
export class GameScreenView extends ScreenView implements IGameScreenView {
  private _titleText: PIXI.Text | null = null;
  private _subtitleText: PIXI.Text | null = null;

  public override postInitialize(): void {
    super.postInitialize();
    (this as unknown as { layout: unknown }).layout = { width: 1, height: 1 };

    this._titleText = new PIXI.Text({
      text: "Color Block Jam",
      style: {
        fill: 0xe8eef6,
        fontSize: 22,
        fontWeight: "800",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      },
    });
    this._titleText.position.set(20, 18);
    this.addChild(this._titleText);

    this._subtitleText = new PIXI.Text({
      text: "",
      style: {
        fill: 0x94a3b8,
        fontSize: 14,
        fontWeight: "600",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      },
    });
    this._subtitleText.position.set(20, 48);
    this.addChild(this._subtitleText);
  }

  public setTitle(title: string): void {
    if (this._titleText) this._titleText.text = title;
  }

  public setSubtitle(subtitle: string): void {
    if (this._subtitleText) this._subtitleText.text = subtitle;
  }

  public override preDestroy(): void {
    this._titleText = null;
    this._subtitleText = null;
    super.preDestroy();
  }
}
