import * as PIXI from "pixi.js";
import type { IDebugBarView, Unsubscribe } from "./IDebugBarView";

export class DebugBarView extends PIXI.Container implements IDebugBarView {
  private static readonly margin = 16;
  private static readonly gap = 10;

  private static readonly toggleWidth = 120;
  private static readonly toggleHeight = 44;

  private static readonly barPadding = 10;
  private static readonly barButtonWidth = 92;
  private static readonly barButtonHeight = 40;
  private static readonly barButtonCount = 1;

  private readonly toggleButton = new PIXI.Container();
  private readonly bar = new PIXI.Container();
  private readonly barBg = new PIXI.Graphics();
  private readonly barButtons: PIXI.Container[] = [];

  constructor() {
    super();

    this.createToggleButton();
    this.createBar();

    this.addChild(this.bar);
    this.addChild(this.toggleButton);

    this.setBarVisible(false);
  }

  private createToggleButton(): void {
    this.toggleButton.eventMode = "static";
    this.toggleButton.cursor = "pointer";

    const bg = new PIXI.Graphics()
      .roundRect(0, 0, DebugBarView.toggleWidth, DebugBarView.toggleHeight, 12)
      .fill({ color: 0x111827, alpha: 0.92 })
      .stroke({ color: 0x334155, width: 1 });
    this.toggleButton.addChild(bg);

    const text = new PIXI.Text({
      text: "Debug",
      style: {
        fill: 0xe8eef6,
        fontSize: 14,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        fontWeight: "600"
      }
    });
    text.position.set(14, 12);
    this.toggleButton.addChild(text);
  }

  private createBar(): void {
    const barHeight = DebugBarView.barPadding * 2 + DebugBarView.barButtonHeight;

    // Background width is computed in `resize()` to fill available canvas width.
    this.barBg
      .roundRect(0, 0, 10, barHeight, 14)
      .fill({ color: 0x0b1220, alpha: 0.9 })
      .stroke({ color: 0x334155, width: 1 });
    this.bar.addChild(this.barBg);

    const labels = ["Grid"];
    for (let i = 0; i < DebugBarView.barButtonCount; i++) {
      const btn = this.createSmallButton(labels[i] ?? `Btn ${i + 1}`);
      this.barButtons.push(btn);
      this.bar.addChild(btn);
    }
  }

  private createSmallButton(label: string): PIXI.Container {
    const button = new PIXI.Container();
    button.eventMode = "static";
    button.cursor = "pointer";

    const bg = new PIXI.Graphics()
      .roundRect(0, 0, DebugBarView.barButtonWidth, DebugBarView.barButtonHeight, 10)
      .fill({ color: 0x111827, alpha: 0.92 })
      .stroke({ color: 0x334155, width: 1 });
    button.addChild(bg);

    const text = new PIXI.Text({
      text: label,
      style: {
        fill: 0xe8eef6,
        fontSize: 13,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial"
      }
    });
    // Approximate centering without relying on text anchors.
    text.position.set(12, 11);
    button.addChild(text);

    return button;
  }

  onToggleDebug(cb: () => void): Unsubscribe {
    const handler = () => cb();
    this.toggleButton.on("pointertap", handler);
    return () => this.toggleButton.off("pointertap", handler);
  }

  onToggleGroundGrid(cb: () => void): Unsubscribe {
    const gridButton = this.barButtons[0];
    if (!gridButton) return () => {};

    const handler = () => cb();
    gridButton.on("pointertap", handler);
    return () => gridButton.off("pointertap", handler);
  }

  setBarVisible(visible: boolean): void {
    this.bar.visible = visible;
  }

  resize(width: number, height: number): void {
    const margin = DebugBarView.margin;

    const toggleX = Math.max(0, width - margin - DebugBarView.toggleWidth);
    const rowBottom = Math.max(0, height - margin);
    const toggleY = Math.max(0, rowBottom - DebugBarView.toggleHeight);
    this.toggleButton.position.set(toggleX, toggleY);

    const barHeight = DebugBarView.barPadding * 2 + DebugBarView.barButtonHeight;

    // Bar sits next to the Debug button and fills remaining width.
    const barLeft = margin;
    const barRight = Math.max(barLeft, toggleX - DebugBarView.gap);
    const barWidth = Math.max(0, barRight - barLeft);

    // Redraw stretch background.
    this.barBg.clear();
    this.barBg
      .roundRect(0, 0, barWidth, barHeight, 14)
      .fill({ color: 0x0b1220, alpha: 0.9 })
      .stroke({ color: 0x334155, width: 1 });

    // Left-align buttons inside the stretched bar.
    const x = DebugBarView.barPadding;
    for (let i = 0; i < this.barButtons.length; i++) {
      const btn = this.barButtons[i];
      btn.position.set(x + i * (DebugBarView.barButtonWidth + DebugBarView.gap), DebugBarView.barPadding);
    }

    const barX = barLeft;
    const barY = Math.max(0, rowBottom - barHeight);
    this.bar.position.set(barX, barY);
  }

  destroy(): void {
    this.toggleButton.removeAllListeners();
    for (const btn of this.barButtons) btn.removeAllListeners();
    this.removeFromParent();
  }
}

