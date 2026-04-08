import * as PIXI from "pixi.js";
import { ScreenView } from "@gamebyte/gamelabsjs";
import type { IGameScreenView } from "./IGameScreenView.js";

/**
 * HUD only — score and hint. The board is {@link Match3GridsView} (Three.js + gamegrid).
 */
export class GameScreenView extends ScreenView implements IGameScreenView {
  private _scoreText: PIXI.Text | null = null;
  private _hintText: PIXI.Text | null = null;

  public override postInitialize(): void {
    this._scoreText = new PIXI.Text({
      text: "Score: 0",
      style: { fontFamily: "system-ui, sans-serif", fontSize: 22, fill: 0xe2e8f0 }
    });
    this._hintText = new PIXI.Text({
      text: "Click a gem, then an adjacent gem to swap (must form a match). Board: 3D view.",
      style: { fontFamily: "system-ui, sans-serif", fontSize: 14, fill: 0x94a3b8 }
    });
    (this as unknown as { layout: unknown }).layout = {
      width: 1,
      height: 1,
      flexDirection: "column",
      justifyContent: "flex-start",
      alignItems: "flex-start",
      padding: 16
    };
    (this as unknown as { addChild: (c: unknown) => void }).addChild(this._scoreText);
    (this as unknown as { addChild: (c: unknown) => void }).addChild(this._hintText);
  }

  public override onResize(width: number, height: number, _dpr: number): void {
    (this as unknown as { layout: unknown }).layout = { width: Math.max(1, width), height: Math.max(1, height) };
    if (this._scoreText) {
      this._scoreText.x = 16;
      this._scoreText.y = 12;
    }
    if (this._hintText) {
      this._hintText.x = 16;
      this._hintText.y = 44;
    }
  }

  public setScore(score: number): void {
    if (this._scoreText) this._scoreText.text = `Score: ${score}`;
  }

  public override preDestroy(): void {
    this._scoreText = null;
    this._hintText = null;
    super.preDestroy();
  }
}
