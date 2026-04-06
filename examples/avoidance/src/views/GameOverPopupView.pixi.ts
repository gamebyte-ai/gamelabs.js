import * as PIXI from "pixi.js";
import { PopupView, ButtonComponent, type Unsubscribe } from "gamelabsjs";
import type { IGameOverPopupView } from "./IGameOverPopupView";

export class GameOverPopupView extends PopupView implements IGameOverPopupView {
  private _text: PIXI.Text | null = null;
  private _waveText: PIXI.Text | null = null;
  private _playAgainBtn: ButtonComponent | null = null;
  private readonly _playAgainListeners = new Set<() => void>();

  public override postInitialize(): void {
    super.postInitialize();

    // Panel
    const panel = new PIXI.Container();
    (panel as any).layout = { width: 320, height: 220, flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 16 };

    const panelBg = new PIXI.Graphics();
    panelBg.roundRect(0, 0, 320, 220, 14);
    panelBg.fill({ color: 0x0a1a10, alpha: 0.95 });
    panelBg.stroke({ color: 0x2a5a3a, width: 2 });
    (panelBg as any).layout = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" };
    panel.addChild(panelBg);

    // Title
    this._text = new PIXI.Text({
      text: "INFECTED!",
      style: { fill: 0xef4444, fontSize: 28, fontWeight: "800", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }
    });
    this._text.anchor.set(0.5, 0.5);
    (this._text as any).layout = {};
    panel.addChild(this._text);

    // Wave score
    this._waveText = new PIXI.Text({
      text: "Survived 0 waves",
      style: { fill: 0x88cc88, fontSize: 18, fontWeight: "600", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }
    });
    this._waveText.anchor.set(0.5, 0.5);
    (this._waveText as any).layout = {};
    panel.addChild(this._waveText);

    // Play Again button
    this._playAgainBtn = new ButtonComponent({
      width: 180, height: 44,
      label: "Play Again",
      labelStyle: { fontSize: 16, fontWeight: "600" },
      radius: 10,
      fillColor: 0x1a3a24,
      strokeColor: 0x2a5a3a,
    });
    panel.addChild(this._playAgainBtn);

    this._playAgainBtn.onPress(() => {
      for (const cb of this._playAgainListeners) cb();
    });

    // Wrapper to center panel
    const wrapper = new PIXI.Container();
    (wrapper as any).layout = { width: "100%", height: "100%", justifyContent: "center", alignItems: "center" };
    wrapper.addChild(panel);
    this.addChild(wrapper);
  }

  public setWave(wave: number): void {
    if (this._waveText) {
      this._waveText.text = wave <= 1 ? "Survived 0 waves" : `Survived ${wave - 1} wave${wave - 1 > 1 ? "s" : ""}`;
    }
  }

  public onPlayAgain(cb: () => void): Unsubscribe {
    this._playAgainListeners.add(cb);
    return () => this._playAgainListeners.delete(cb);
  }

  public override preDestroy(): void {
    this._playAgainListeners.clear();
    this._text = null;
    this._waveText = null;
    this._playAgainBtn = null;
  }
}
