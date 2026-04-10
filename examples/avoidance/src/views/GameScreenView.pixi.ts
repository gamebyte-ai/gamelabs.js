import * as PIXI from "pixi.js";
import { ScreenView, OnScreenControlsView } from "@gamebyte/gamelabsjs";
import type { IGameScreenView } from "./IGameScreenView";

export class GameScreenView extends ScreenView implements IGameScreenView {
  private _waveLabel: PIXI.Text | null = null;
  private _waveAnnounce: PIXI.Text | null = null;
  private _onScreenControls: OnScreenControlsView | null = null;

  public postInitialize(): void {
    (this as any).layout = { width: 1, height: 1 };

    this._waveLabel = new PIXI.Text({
      text: "WAVE 1",
      style: { fill: 0x88cc88, fontSize: 18, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial", fontWeight: "600" }
    });
    (this._waveLabel as any).layout = { position: "absolute", left: 16, top: 16 };
    this.addChild(this._waveLabel);

    this._waveAnnounce = new PIXI.Text({
      text: "",
      style: { fill: 0xccffcc, fontSize: 48, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial", fontWeight: "800" }
    });
    this._waveAnnounce.anchor.set(0.5, 0.5);
    this._waveAnnounce.visible = false;
    this.addChild(this._waveAnnounce);

    // On-screen controls as a sub-view
    this._onScreenControls = this.viewFactory.createView(OnScreenControlsView);
    this.addChild(this._onScreenControls);

    this.on("layout", () => this._updateWaveAnnouncePosition());
  }

  public override onResize(width: number, height: number, _dpr: number): void {
    (this as any).layout = { width: Math.max(1, width), height: Math.max(1, height) };
    this._onScreenControls?.resize(width, height);
  }

  public showWaveText(wave: number): void {
    if (!this._waveAnnounce) return;
    this._waveAnnounce.text = `WAVE ${wave}`;
    this._waveAnnounce.visible = true;
    this._updateWaveAnnouncePosition();
  }

  public hideWaveText(): void {
    if (this._waveAnnounce) this._waveAnnounce.visible = false;
  }

  public setWave(wave: number): void {
    if (this._waveLabel) this._waveLabel.text = `WAVE ${wave}`;
  }

  private _updateWaveAnnouncePosition(): void {
    if (!this._waveAnnounce) return;
    const layout = (this as any).layout;
    const w = typeof layout?.computedLayout?.width === "number" ? layout.computedLayout.width : 400;
    const h = typeof layout?.computedLayout?.height === "number" ? layout.computedLayout.height : 300;
    this._waveAnnounce.position.set(w / 2, h / 2);
  }

  public override preDestroy(): void {
    this._onScreenControls?.destroy();
    this._onScreenControls = null;
  }
}
