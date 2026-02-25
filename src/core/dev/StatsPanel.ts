import { Container, Graphics, Text, TextStyle } from "pixi.js";

import type { IStatsPanel } from "./IStatsPanel.js";

export class StatsPanel implements IStatsPanel {
  private readonly _overlayLayer: Container;
  private readonly _root: Container;
  private readonly _bg: Graphics;
  private readonly _text: Text;

  private _visible = false;
  private _lastLogicalWidth = 1;
  private _lastLogicalHeight = 1;
  private _lastDpr = 1;

  public static createPanel(overlayLayer: Container): StatsPanel {
    return new StatsPanel(overlayLayer);
  }

  private constructor(overlayLayer: Container) {
    this._overlayLayer = overlayLayer;

    const root = new Container();
    root.visible = false;
    root.x = 8;
    root.y = 8;

    const bg = new Graphics();
    const text = new Text({
      text: "",
      style: new TextStyle({
        fill: 0xffffff,
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: 12
      })
    });

    text.x = 8;
    text.y = 6;

    root.addChild(bg);
    root.addChild(text);

    this._overlayLayer.addChild(root);

    this._root = root;
    this._bg = bg;
    this._text = text;
  }

  public get isVisible(): boolean {
    return this._visible;
  }

  public show(show: boolean): void {
    this._visible = show;
    this._root.visible = show;
    if (show) this.updateTextAndLayout();
  }

  public resize(width: number, height: number, dpr?: number): void {
    this._lastLogicalWidth = width;
    this._lastLogicalHeight = height;
    if (typeof dpr === "number" && Number.isFinite(dpr)) this._lastDpr = dpr;
    if (this._visible) this.updateTextAndLayout();
  }

  public destroy(): void {
    this._overlayLayer.removeChild(this._root);
    this._root.destroy({ children: true });
  }

  private updateTextAndLayout(): void {
    const w = Math.max(1, Math.floor(this._lastLogicalWidth));
    const h = Math.max(1, Math.floor(this._lastLogicalHeight));
    const dpr = Number.isFinite(this._lastDpr) ? Math.round(this._lastDpr * 100) / 100 : 1;
    this._text.text = `STATS\nWidth  : ${w}\nHeight : ${h}\nDPR    : ${dpr}`;

    const paddingX = 8;
    const paddingY = 6;
    const textW = Math.ceil(this._text.width);
    const textH = Math.ceil(this._text.height);
    const boxW = paddingX + textW + paddingX;
    const boxH = paddingY + textH + paddingY;

    this._bg.clear();
    this._bg.roundRect(0, 0, boxW, boxH, 6);
    this._bg.fill({ color: 0x000000, alpha: 0.45 });
  }
}

