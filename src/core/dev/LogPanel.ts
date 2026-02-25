import { Container, Graphics, Rectangle, Text, TextStyle } from "pixi.js";
import type { Hud } from "../Hud.js";

export type LogPanelOptions = {
  title?: string;
  panelHeight?: number;
  headerHeight?: number;
  paddingX?: number;
  paddingY?: number;
  itemGap?: number;
  maxItems?: number;
  onClose?: () => void;
};

export class LogPanel {
  private readonly _overlayLayer: Container;
  private readonly _title: string;
  private readonly _panelHeight: number;
  private readonly _headerHeight: number;
  private readonly _paddingX: number;
  private readonly _paddingY: number;
  private readonly _itemGap: number;
  private readonly _maxItems: number;
  private readonly _onClose: (() => void) | null;

  private readonly _root: Container;
  private readonly _panelBg: Graphics;
  private readonly _headerBg: Graphics;
  private readonly _titleText: Text;
  private readonly _closeRoot: Container;
  private readonly _closeBg: Graphics;
  private readonly _closeText: Text;
  private readonly _contentViewport: Container;
  private readonly _contentMask: Graphics;
  private readonly _itemsRoot: Container;

  private _visible = false;
  private _scrollY = 0;
  private _contentHeight = 0;
  private _lastLogicalWidth = 1;
  private _lastLogicalHeight = 1;

  public static createPanel(hud: Hud, options: LogPanelOptions = {}): LogPanel {
    return new LogPanel(hud.overlayLayer, options);
  }

  private constructor(overlayLayer: Container, options: LogPanelOptions = {}) {
    this._overlayLayer = overlayLayer;
    this._title = options.title ?? "Logger";
    this._panelHeight = options.panelHeight ?? 200;
    this._headerHeight = options.headerHeight ?? 28;
    this._paddingX = options.paddingX ?? 10;
    this._paddingY = options.paddingY ?? 8;
    this._itemGap = options.itemGap ?? 4;
    this._maxItems = options.maxItems ?? 250;
    this._onClose = options.onClose ?? null;

    const root = new Container();
    root.visible = false;
    root.eventMode = "static";

    const panelBg = new Graphics();
    const headerBg = new Graphics();

    const titleText = new Text({
      text: this._title,
      style: new TextStyle({
        fill: 0xffffff,
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: 13,
        fontWeight: "600"
      })
    });

    const closeRoot = new Container();
    closeRoot.eventMode = "static";
    (closeRoot as any).cursor = "pointer";

    const closeBg = new Graphics();
    const closeText = new Text({
      text: "✕",
      style: new TextStyle({
        fill: 0xffffff,
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: 13,
        fontWeight: "600"
      })
    });

    closeText.anchor.set(0.5, 0.5);
    closeRoot.addChild(closeBg);
    closeRoot.addChild(closeText);
    closeRoot.on("pointertap", () => this.handleCloseTapped());

    const contentViewport = new Container();
    const contentMask = new Graphics();
    contentViewport.mask = contentMask;

    const itemsRoot = new Container();
    contentViewport.addChild(itemsRoot);

    root.on("wheel", (e: any) => this.handleWheel(e));

    root.addChild(panelBg);
    root.addChild(headerBg);
    root.addChild(titleText);
    root.addChild(closeRoot);
    root.addChild(contentViewport);
    root.addChild(contentMask);

    this._overlayLayer.addChild(root);

    this._root = root;
    this._panelBg = panelBg;
    this._headerBg = headerBg;
    this._titleText = titleText;
    this._closeRoot = closeRoot;
    this._closeBg = closeBg;
    this._closeText = closeText;
    this._contentViewport = contentViewport;
    this._contentMask = contentMask;
    this._itemsRoot = itemsRoot;
  }

  public get isVisible(): boolean {
    return this._visible;
  }

  public show(show: boolean): void {
    this._visible = show;
    this._root.visible = show;
    if (show) {
      this.reflowItems();
      this.updateLayout();
    }
  }

  public resize(width: number, height: number): void {
    this._lastLogicalWidth = width;
    this._lastLogicalHeight = height;
    this.reflowItems();
    this.updateLayout();
  }

  public log(message: string): void {
    this.appendItem(message);
    this.scrollToBottom();
  }

  private appendItem(message: string): void {
    const w = Math.max(1, Math.floor(this._lastLogicalWidth));
    const isOdd = this._itemsRoot.children.length % 2 === 1;

    const style = new TextStyle({
      fill: 0xffffff,
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      fontSize: 12,
      // Keep log lines single-line; overflow is clipped by the panel mask.
      wordWrap: false,
      breakWords: false
    });

    const itemRoot = new Container();
    itemRoot.x = 0;
    itemRoot.y = this._paddingY + this._contentHeight;
    (itemRoot as any)._logMessage = message;

    const itemBg = new Graphics();

    const itemText = new Text({ text: message, style });
    itemText.alpha = 0.9;
    itemText.x = this._paddingX;
    itemText.y = 0;

    itemRoot.addChild(itemBg);
    itemRoot.addChild(itemText);
    this._itemsRoot.addChild(itemRoot);

    const itemH = Math.ceil(itemText.height);
    if (isOdd) {
      itemBg.clear();
      itemBg.rect(0, 0, w, itemH);
      itemBg.fill({ color: 0xffffff, alpha: 0.06 });
    }
    this._contentHeight += itemH + this._itemGap;

    while (this._itemsRoot.children.length > this._maxItems) {
      const first = this._itemsRoot.children[0] as any;
      const removedH = Math.ceil(first.height) + this._itemGap;
      first.destroy?.();
      this._itemsRoot.removeChildAt(0);
      for (const child of this._itemsRoot.children) {
        (child as any).y -= removedH;
      }
      this._contentHeight = Math.max(0, this._contentHeight - removedH);
      this._scrollY = Math.max(0, this._scrollY - removedH);
    }
  }

  private reflowItems(): void {
    if (this._itemsRoot.children.length === 0) return;

    const messages: string[] = [];
    for (const child of this._itemsRoot.children) {
      const c = child as any;
      if (typeof c?._logMessage === "string") {
        messages.push(c._logMessage);
        continue;
      }

      const kids = Array.isArray(c?.children) ? (c.children as any[]) : [];
      const text = kids.find((k) => k instanceof Text) as Text | undefined;
      if (typeof text?.text === "string") messages.push(text.text);
    }

    if (messages.length === 0) return;

    const oldChildren = this._itemsRoot.removeChildren();
    for (const child of oldChildren) (child as any).destroy?.({ children: true });

    this._scrollY = 0;
    this._contentHeight = 0;

    for (const message of messages) this.appendItem(message);

    this.scrollToBottom();
  }

  public destroy(): void {
    this._root.removeAllListeners();
    this._closeRoot.removeAllListeners();
    this._overlayLayer.removeChild(this._root);
    this._root.destroy({ children: true });
  }

  private handleCloseTapped(): void {
    this.show(false);
    this._onClose?.();
  }

  private handleWheel(e: any): void {
    const dy = typeof e?.deltaY === "number" ? e.deltaY : 0;
    if (!Number.isFinite(dy) || dy === 0) return;
    this.scrollBy(dy);
  }

  private updateLayout(): void {
    if (!this._visible) return;

    const w = Math.max(1, Math.floor(this._lastLogicalWidth));
    const h = Math.max(1, Math.floor(this._lastLogicalHeight));
    const panelH = Math.min(this._panelHeight, Math.max(80, h));
    const headerH = Math.min(this._headerHeight, panelH);
    const contentH = Math.max(1, panelH - headerH);

    this._root.x = 0;
    this._root.y = Math.max(0, h - panelH);
    this._root.hitArea = new Rectangle(0, 0, w, panelH);

    this._panelBg.clear();
    this._panelBg.rect(0, 0, w, panelH);
    this._panelBg.fill({ color: 0x000000, alpha: 0.35 });

    this._headerBg.clear();
    this._headerBg.rect(0, 0, w, headerH);
    this._headerBg.fill({ color: 0x000000, alpha: 0.55 });

    this._titleText.x = this._paddingX;
    this._titleText.y = Math.max(0, Math.floor((headerH - this._titleText.height) * 0.5));

    const closeButtonSize = 22;
    const closeButtonPaddingRight = 8;
    this._closeRoot.x = Math.max(0, w - closeButtonPaddingRight - closeButtonSize);
    this._closeRoot.y = Math.max(0, Math.floor((headerH - closeButtonSize) * 0.5));
    this._closeRoot.hitArea = new Rectangle(0, 0, closeButtonSize, closeButtonSize);

    this._closeBg.clear();
    this._closeBg.roundRect(0, 0, closeButtonSize, closeButtonSize, 6);
    this._closeBg.fill({ color: 0xffffff, alpha: 0.12 });

    this._closeText.x = Math.floor(closeButtonSize * 0.5);
    this._closeText.y = Math.floor(closeButtonSize * 0.5);

    this._contentViewport.x = 0;
    this._contentViewport.y = headerH;

    this._contentMask.clear();
    this._contentMask.rect(0, headerH, w, contentH);
    this._contentMask.fill({ color: 0xffffff, alpha: 1 });

    this.applyScroll();
  }

  private scrollBy(deltaY: number): void {
    const rootH = Math.min(this._panelHeight, Math.max(80, Math.max(1, Math.floor(this._lastLogicalHeight))));
    const headerH = Math.min(this._headerHeight, rootH);
    const contentH = Math.max(1, rootH - headerH);
    const maxScroll = Math.max(0, this._paddingY + this._contentHeight - contentH);
    this._scrollY = Math.min(maxScroll, Math.max(0, this._scrollY + deltaY));
    this.applyScroll();
  }

  private scrollToBottom(): void {
    const rootH = Math.min(this._panelHeight, Math.max(80, Math.max(1, Math.floor(this._lastLogicalHeight))));
    const headerH = Math.min(this._headerHeight, rootH);
    const contentH = Math.max(1, rootH - headerH);
    const maxScroll = Math.max(0, this._paddingY + this._contentHeight - contentH);
    this._scrollY = maxScroll;
    this.applyScroll();
  }

  private applyScroll(): void {
    this._itemsRoot.y = -this._scrollY;
  }
}

