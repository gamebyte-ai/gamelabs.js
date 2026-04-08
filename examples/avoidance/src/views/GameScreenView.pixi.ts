import * as PIXI from "pixi.js";
import { ScreenView, type Unsubscribe } from "@gamebyte/gamelabsjs";
import type { IGameScreenView } from "./IGameScreenView";

export class GameScreenView extends ScreenView implements IGameScreenView {
  // HUD
  private _waveLabel: PIXI.Text | null = null;
  private _waveAnnounce: PIXI.Text | null = null;

  // Input
  private readonly _keysDown = new Set<string>();
  private readonly _directionListeners = new Set<(dx: number, dy: number) => void>();
  private readonly _onKeyDown = (e: KeyboardEvent): void => { this._keysDown.add(e.code); };
  private readonly _onKeyUp = (e: KeyboardEvent): void => { this._keysDown.delete(e.code); };

  public postInitialize(): void {
    (this as any).layout = {
      width: 1,
      height: 1,
    };

    // Wave label (top-left)
    this._waveLabel = new PIXI.Text({
      text: "WAVE 1",
      style: { fill: 0x88cc88, fontSize: 18, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial", fontWeight: "600" }
    });
    (this._waveLabel as any).layout = { position: "absolute", left: 16, top: 16 };
    this.addChild(this._waveLabel);

    // Wave announcement (center, large)
    this._waveAnnounce = new PIXI.Text({
      text: "",
      style: { fill: 0xccffcc, fontSize: 48, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial", fontWeight: "800" }
    });
    this._waveAnnounce.anchor.set(0.5, 0.5);
    this._waveAnnounce.visible = false;
    this.addChild(this._waveAnnounce);

    // Keyboard input
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);

    this.on("layout", () => {
      this._updateWaveAnnouncePosition();
    });
  }

  public override onResize(width: number, height: number, _dpr: number): void {
    (this as any).layout = { width: Math.max(1, width), height: Math.max(1, height) };
  }

  public pollInput(): void {
    let dx = 0, dy = 0;
    if (this._keysDown.has("ArrowLeft") || this._keysDown.has("KeyA")) dx -= 1;
    if (this._keysDown.has("ArrowRight") || this._keysDown.has("KeyD")) dx += 1;
    if (this._keysDown.has("ArrowUp") || this._keysDown.has("KeyW")) dy -= 1;
    if (this._keysDown.has("ArrowDown") || this._keysDown.has("KeyS")) dy += 1;
    if (dx !== 0 || dy !== 0) {
      for (const cb of this._directionListeners) cb(dx, dy);
    }
  }

  public onDirectionInput(cb: (dx: number, dy: number) => void): Unsubscribe {
    this._directionListeners.add(cb);
    return () => this._directionListeners.delete(cb);
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
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    this._directionListeners.clear();
    this._keysDown.clear();
  }
}
