import * as PIXI from "pixi.js";
import {
  HudViewBase,
  ScrollViewComponent,
  type IInstanceResolver,
  type Unsubscribe,
} from "@gamebyte/gamelabsjs";
import { UIPlaygroundConfig } from "../UIPlaygroundConfig.js";
import {
  SCROLL_VIEW_ITEM_PALETTE,
  type ScrollViewDirectionPreset,
} from "../constants/DemoPresets.js";
import type { IScrollViewDemoView } from "./IScrollViewDemoView.js";

const VIEWPORT_WIDTH = 320;
const VIEWPORT_HEIGHT = 320;
const ITEM_SIZE = 60;
const ITEM_GAP = 8;
/**
 * Items are arranged in a fixed-column grid regardless of scroll
 * direction. With 8 columns of 60-px squares plus 8-px gaps the
 * content is wide enough (`8·60 + 7·8 = 536`) for `"horizontal"` and
 * `"both"` directions to actually scroll, while item counts above
 * ~30 give plenty of vertical scroll too.
 */
const COLUMNS = 8;

/**
 * Live preview for the `ScrollViewComponent` playground demo.
 *
 * Direction / showScrollbar / wheelSpeed changes rebuild the underlying
 * scroll view (those are constructor-only). Item count mutates the
 * existing `content` container in-place — items are added/removed
 * without resetting the scroll position — and `refresh()` updates the
 * scroll bounds afterwards. Scroll events are forwarded to the
 * controller for the event log.
 *
 * Outline: drawn at the scroll view's fixed viewport bounds. Added as
 * a sibling of the masked content so it isn't clipped.
 */
export class ScrollViewDemoView extends HudViewBase implements IScrollViewDemoView {
  private _config: UIPlaygroundConfig | null = null;
  private _scroll: ScrollViewComponent | null = null;
  private _outline: PIXI.Graphics | null = null;
  private _outlineVisible = false;
  private _scrollUnsub: Unsubscribe | null = null;
  private readonly _scrollListeners = new Set<(x: number, y: number) => void>();

  // Mutable props.
  private _direction: ScrollViewDirectionPreset = "vertical";
  private _itemCount = 30;
  private _showScrollbar = true;
  private _wheelSpeed = 50;
  private readonly _itemContainers: PIXI.Container[] = [];

  public override inject(resolver: IInstanceResolver): void {
    super.inject(resolver);
    this._config = resolver.getInstance(UIPlaygroundConfig);
  }

  public override postInitialize(): void {
    super.postInitialize();
    this.layout = {};
    this._rebuildScroll();
  }

  public setDirection(direction: ScrollViewDirectionPreset): void {
    if (this._direction === direction) return;
    this._direction = direction;
    this._rebuildScroll();
  }

  public setItemCount(count: number): void {
    if (count === this._itemCount) return;
    this._itemCount = count;
    if (!this._scroll) return;
    // Trim or extend without rebuilding the scroll view, so the
    // current scroll position survives slider drags.
    while (this._itemContainers.length > count) {
      const item = this._itemContainers.pop()!;
      item.removeFromParent();
      item.destroy({ children: true });
    }
    while (this._itemContainers.length < count) {
      const item = this._makeItem(this._itemContainers.length);
      this._scroll.content.addChild(item);
      this._itemContainers.push(item);
    }
    this._applyContentSize();
  }

  public setShowScrollbar(visible: boolean): void {
    if (this._showScrollbar === visible) return;
    this._showScrollbar = visible;
    this._rebuildScroll();
  }

  public setWheelSpeed(speed: number): void {
    if (this._wheelSpeed === speed) return;
    this._wheelSpeed = speed;
    this._rebuildScroll();
  }

  public scrollToStart(): void {
    this._scroll?.scrollTo(0, 0);
  }

  public scrollToEnd(): void {
    if (!this._scroll) return;
    this._scroll.scrollTo(this._scroll.scrollableWidth, this._scroll.scrollableHeight);
  }

  public setOutlineVisible(visible: boolean): void {
    this._outlineVisible = visible;
    this._refreshOutline();
  }

  public onScroll(cb: (x: number, y: number) => void): Unsubscribe {
    this._scrollListeners.add(cb);
    return () => this._scrollListeners.delete(cb);
  }

  public override preDestroy(): void {
    this._scrollListeners.clear();
    this._scrollUnsub?.();
    this._scrollUnsub = null;
    this._outline?.removeFromParent();
    this._outline?.destroy();
    this._outline = null;
    this._destroyAllItems();
    this._scroll?.removeFromParent();
    this._scroll?.destroy({ children: true });
    this._scroll = null;
    this._config = null;
    super.preDestroy();
  }

  private _fireScroll(x: number, y: number): void {
    for (const cb of this._scrollListeners) cb(x, y);
  }

  private _destroyAllItems(): void {
    for (const item of this._itemContainers) {
      item.removeFromParent();
      item.destroy({ children: true });
    }
    this._itemContainers.length = 0;
  }

  private _rebuildScroll(): void {
    this._scrollUnsub?.();
    this._scrollUnsub = null;
    this._outline?.removeFromParent();
    this._outline?.destroy();
    this._outline = null;
    this._destroyAllItems();
    this._scroll?.removeFromParent();
    this._scroll?.destroy({ children: true });

    this._scroll = new ScrollViewComponent({
      width: VIEWPORT_WIDTH,
      height: VIEWPORT_HEIGHT,
      direction: this._direction,
      showScrollbar: this._showScrollbar,
      wheelSpeed: this._wheelSpeed,
      fillColor: 0x0b1220,
      fillAlpha: 1,
    });
    this._scrollUnsub = this._scroll.onScroll((x, y) => this._fireScroll(x, y));
    this.addChild(this._scroll);

    for (let i = 0; i < this._itemCount; i++) {
      const item = this._makeItem(i);
      this._scroll.content.addChild(item);
      this._itemContainers.push(item);
    }
    this._applyContentSize();
    this._refreshOutline();
  }

  /**
   * Push the exact content size into the scroll view based on the
   * known grid layout. Doing the math ourselves bypasses
   * `scroll.refresh()` (which calls `content.getLocalBounds()`); for
   * large item counts that bounds reading was returning a clipped
   * value capped at the mask's viewport, so scrolling stopped before
   * items past the first 8 rows could be reached.
   */
  private _applyContentSize(): void {
    if (!this._scroll) return;
    if (this._itemCount <= 0) {
      this._scroll.setContentSize(0, 0);
      return;
    }
    const cols = Math.min(this._itemCount, COLUMNS);
    const rows = Math.ceil(this._itemCount / COLUMNS);
    const w = cols * ITEM_SIZE + (cols - 1) * ITEM_GAP;
    const h = rows * ITEM_SIZE + (rows - 1) * ITEM_GAP;
    this._scroll.setContentSize(w, h);
  }

  private _makeItem(index: number): PIXI.Container {
    const container = new PIXI.Container();
    const col = index % COLUMNS;
    const row = Math.floor(index / COLUMNS);
    container.position.set(col * (ITEM_SIZE + ITEM_GAP), row * (ITEM_SIZE + ITEM_GAP));

    const bg = new PIXI.Graphics();
    bg.roundRect(0, 0, ITEM_SIZE, ITEM_SIZE, 6).fill({
      color: SCROLL_VIEW_ITEM_PALETTE[index % SCROLL_VIEW_ITEM_PALETTE.length]!,
    });
    container.addChild(bg);

    const text = new PIXI.Text({
      text: `${index + 1}`,
      style: { fill: 0xffffff, fontSize: 16, fontWeight: "700" },
    });
    text.anchor.set(0.5);
    text.position.set(ITEM_SIZE / 2, ITEM_SIZE / 2);
    container.addChild(text);

    return container;
  }

  private _refreshOutline(): void {
    this._outline?.removeFromParent();
    this._outline?.destroy();
    this._outline = null;
    if (!this._outlineVisible || !this._scroll || !this._config) return;

    const outline = new PIXI.Graphics();
    outline.eventMode = "none";
    outline
      .rect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT)
      .stroke({ color: this._config.outlineColor, width: this._config.outlineWidth });
    // Sibling of `content` (added to the scroll view itself) so the
    // outline isn't clipped by the content mask.
    this._scroll.addChild(outline);
    this._outline = outline;
  }
}
