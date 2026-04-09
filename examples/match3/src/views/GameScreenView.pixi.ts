import * as PIXI from "pixi.js";
import { ScreenView, ButtonComponent, type Unsubscribe } from "gamelabsjs";
import type { IGameScreenView } from "./IGameScreenView.js";

export class GameScreenView extends ScreenView implements IGameScreenView {
  private _scoreText: PIXI.Text | null = null;
  private _settingsBtn: ButtonComponent | null = null;
  private readonly _settingsListeners = new Set<() => void>();
  private _screenWidth = 0;

  public override postInitialize(): void {
    (this as any).layout = {
      width: 1,
      height: 1,
      flexDirection: "column",
      justifyContent: "flex-start",
      alignItems: "flex-start",
      padding: 16
    };

    this._scoreText = new PIXI.Text({
      text: "Score: 0",
      style: { fontFamily: "system-ui, sans-serif", fontSize: 22, fill: 0xe2e8f0 }
    });
    this.addChild(this._scoreText);

    // Settings button (top-right gear icon)
    this._settingsBtn = new ButtonComponent({
      width: 36, height: 36,
      label: "\u2699",
      labelStyle: { fontSize: 20 },
      radius: 18,
      fillColor: 0x334155,
      fillAlpha: 0.7,
      strokeColor: 0x475569,
    });
    this.addChild(this._settingsBtn);
    this._settingsBtn.onPress(() => {
      for (const cb of this._settingsListeners) cb();
    });
  }

  public override onResize(width: number, height: number, _dpr: number): void {
    this._screenWidth = Math.max(1, width);
    (this as any).layout = { width: this._screenWidth, height: Math.max(1, height) };
    if (this._scoreText) {
      this._scoreText.x = 16;
      this._scoreText.y = 12;
    }
    if (this._settingsBtn) {
      this._settingsBtn.position.set(this._screenWidth - 52, 12);
    }
  }

  public setScore(score: number): void {
    if (this._scoreText) this._scoreText.text = `Score: ${score}`;
  }

  public onSettingsTapped(cb: () => void): Unsubscribe {
    this._settingsListeners.add(cb);
    return () => this._settingsListeners.delete(cb);
  }

  public override preDestroy(): void {
    this._settingsListeners.clear();
    this._scoreText = null;
    this._settingsBtn = null;
    super.preDestroy();
  }
}
