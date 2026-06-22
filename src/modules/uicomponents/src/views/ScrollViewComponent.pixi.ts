import type { LayoutOptions } from "@pixi/layout";
import type { DestroyOptions, FederatedPointerEvent, FederatedWheelEvent, NineSliceSprite, Sprite } from "pixi.js";
import { Container, Graphics, Rectangle } from "pixi.js";
import type { AssetManager } from "../../../../core/assets/AssetManager.js";
import type { SpriteStyle } from "../../../../core/styles/SpriteStyle.js";
import { StyledHudObject } from "../../../../core/styles/StyledHudObject.js";
import type { Unsubscribe } from "../../../../core/events/subscriptions.js";
import type { ScrollViewComponentStyle } from "../UIComponentsStyleTypes.js";

export type ScrollViewDirection = "vertical" | "horizontal" | "both";

/**
 * Geometry / behaviour options for a {@link ScrollViewComponent}. Visual
 * styling for the scrollbar (track + thumb textures, tints, alphas, 9-slice
 * border) lives on the {@link ScrollViewComponentStyle} passed alongside the
 * asset manager and is owned by the framework's `StyleManager`.
 */
export type ScrollViewComponentOpts = {
  /** X position. */
  x?: number;
  /** Y position. */
  y?: number;
  /** Viewport width in pixels. */
  width: number;
  /** Viewport height in pixels. */
  height: number;
  /** Allowed scroll axis. @default "vertical" */
  direction?: ScrollViewDirection;
  /** Background fill color (drawn behind content). @default 0x000000 */
  fillColor?: number;
  /** Background fill alpha. 0 = no background drawn. @default 0 */
  fillAlpha?: number;
  /**
   * Whether to draw the interactive scrollbar (thumb-drag + click-on-track
   * jump-to-position). @default true
   */
  showScrollbar?: boolean;
  /** Track thickness in pixels (cross-axis). @default 4 */
  scrollbarThickness?: number;
  /**
   * Thumb thickness in pixels (cross-axis). Defaults to the track
   * thickness; set it larger than the track for a thumb that visually
   * sits on top of the rail (the centre of the thumb stays aligned with
   * the centre of the track, so the overflow is split evenly).
   */
  thumbThickness?: number;
  /**
   * Fixed thumb length in pixels (main-axis). When set, the thumb keeps
   * this length regardless of the visible/total content ratio — useful
   * for "knob" style scrollbars where the thumb is a small fixed square
   * dragged along a long track. When omitted, the thumb sizes itself
   * proportionally to the visible/total ratio (legacy behaviour).
   */
  thumbLength?: number;
  /** Distance between scrollbar and viewport edge, in pixels. @default 2 */
  scrollbarMargin?: number;
  /** Pixels scrolled per wheel notch (browser delta is divided by 100). @default 50 */
  wheelSpeed?: number;
  /** Whether dragging on the viewport background pans the content. @default true */
  dragEnabled?: boolean;
};

/**
 * Reusable scrollable container, themed via the framework's style system.
 *
 * Construction takes an `AssetManager`, a
 * {@link ScrollViewComponentStyle}, and geometry / behaviour options:
 *
 * ```ts
 * const style = this.styleManager.resolve<ScrollViewComponentStyle>(
 *   UIComponentsStyleIds.ScrollView,
 * );
 * const scroll = new ScrollViewComponent(this.assetLoader, style, {
 *   width: 320, height: 240, direction: "vertical",
 * });
 * scroll.content.addChild(myList);
 * scroll.refresh();
 * ```
 *
 * - Exposes a public {@link content} container — add scrollable children
 *   directly to it.
 * - Clips content to a fixed `width × height` viewport via a Pixi mask;
 *   the content container is translated by `(-scrollX, -scrollY)` so
 *   children outside the viewport simply aren't drawn.
 * - Input: mouse-wheel scrolls anywhere over the viewport. Drag-to-pan
 *   only starts when the pointer goes down on the viewport background
 *   (not on a child) — this avoids hijacking taps on interactive
 *   children. Standalone consumers who want drag-anywhere can wire it
 *   on top of `onScroll` themselves.
 * - Scrollbar is interactive: drag the thumb to scroll, or click on the
 *   track to jump-scroll (the thumb centers on the click, then drag
 *   continues from the new position). Each axis is a `Container` with
 *   two textured sprites (track + thumb) — the parent carries the hit
 *   area covering both, so the user can grab the thumb even when its
 *   thickness exceeds the track's.
 * - Content size is determined by {@link refresh} (reads
 *   `content.getLocalBounds()`) or {@link setContentSize}. Call after
 *   adding/removing children so scroll bounds and the scrollbar
 *   reflect the new layout.
 */
export class ScrollViewComponent extends StyledHudObject<ScrollViewComponentStyle> {
  /**
   * Public content container — add scrollable children here. The
   * container is translated as the user scrolls; its own children
   * keep their natural local coordinates.
   */
  public readonly content: Container;

  private readonly _viewportWidth: number;
  private readonly _viewportHeight: number;
  private readonly _direction: ScrollViewDirection;
  private readonly _wheelSpeed: number;
  private readonly _dragEnabled: boolean;
  private readonly _scrollbarThickness: number;
  private readonly _thumbThickness: number;
  private readonly _thumbLength: number | null;
  private readonly _scrollbarMargin: number;
  private readonly _trackStyle: SpriteStyle | undefined;
  private readonly _thumbStyle: SpriteStyle | undefined;
  private readonly _bg: Graphics;
  private readonly _mask: Graphics;
  private readonly _scrollbarV: Container | null;
  private readonly _scrollbarH: Container | null;
  private readonly _trackV: Sprite | NineSliceSprite | null;
  private readonly _thumbV: Sprite | NineSliceSprite | null;
  private readonly _trackH: Sprite | NineSliceSprite | null;
  private readonly _thumbH: Sprite | NineSliceSprite | null;
  private readonly _scrollListeners = new Set<(x: number, y: number) => void>();

  private _scrollX = 0;
  private _scrollY = 0;
  private _contentWidth = 0;
  private _contentHeight = 0;
  /**
   * Active pointer-drag mode. Mutually exclusive: only one of viewport
   * pan, vertical-scrollbar drag, or horizontal-scrollbar drag is live
   * at a time. Determines how `globalpointermove` deltas map back onto
   * scroll offsets.
   */
  private _dragMode: "none" | "viewport" | "scrollbarV" | "scrollbarH" = "none";
  private _dragStartPointerX = 0;
  private _dragStartPointerY = 0;
  private _dragStartScrollX = 0;
  private _dragStartScrollY = 0;

  public constructor(assetManager: AssetManager, style: ScrollViewComponentStyle, opts: ScrollViewComponentOpts) {
    super(assetManager, style);

    if (opts.x !== undefined) this.x = opts.x;
    if (opts.y !== undefined) this.y = opts.y;

    this._viewportWidth = opts.width;
    this._viewportHeight = opts.height;
    this._direction = opts.direction ?? "vertical";
    this._wheelSpeed = opts.wheelSpeed ?? 50;
    this._dragEnabled = opts.dragEnabled ?? true;
    this._scrollbarThickness = opts.scrollbarThickness ?? 4;
    this._thumbThickness = opts.thumbThickness ?? this._scrollbarThickness;
    this._thumbLength = opts.thumbLength ?? null;
    this._scrollbarMargin = opts.scrollbarMargin ?? 2;
    const showScrollbar = opts.showScrollbar ?? true;

    this._trackStyle = style.track;
    this._thumbStyle = style.thumb;

    this._bg = new Graphics();
    this._bg.eventMode = "none";
    const fillAlpha = opts.fillAlpha ?? 0;
    if (fillAlpha > 0) {
      this._bg.rect(0, 0, this._viewportWidth, this._viewportHeight).fill({ color: opts.fillColor ?? 0x000000, alpha: fillAlpha });
    }
    this.addChild(this._bg);

    // Mask used to clip the content container to the viewport. It
    // lives in the scene graph as a sibling of `content` so its world
    // transform tracks the scroll view; Pixi renders it into the
    // stencil buffer rather than drawing it visibly.
    this._mask = new Graphics();
    this._mask.rect(0, 0, this._viewportWidth, this._viewportHeight).fill({ color: 0xffffff });
    this.addChild(this._mask);

    this.content = new Container();
    this.content.mask = this._mask;
    this.addChild(this.content);

    if (showScrollbar && this._direction !== "horizontal") {
      const built = this._buildScrollbar("v");
      this._scrollbarV = built.container;
      this._trackV = built.track;
      this._thumbV = built.thumb;
    } else {
      this._scrollbarV = null;
      this._trackV = null;
      this._thumbV = null;
    }
    if (showScrollbar && this._direction !== "vertical") {
      const built = this._buildScrollbar("h");
      this._scrollbarH = built.container;
      this._trackH = built.track;
      this._thumbH = built.thumb;
    } else {
      this._scrollbarH = null;
      this._trackH = null;
      this._thumbH = null;
    }

    const layout: Omit<LayoutOptions, "target"> = {
      width: this._viewportWidth,
      height: this._viewportHeight,
    };
    this.layout = layout;

    this.eventMode = "static";
    this.hitArea = new Rectangle(0, 0, this._viewportWidth, this._viewportHeight);
    this.on("pointerdown", (e: FederatedPointerEvent) => this._onPointerDown(e));
    this.on("globalpointermove", (e: FederatedPointerEvent) => this._onGlobalPointerMove(e));
    this.on("pointerup", () => this._endDrag());
    this.on("pointerupoutside", () => this._endDrag());
    this.on("wheel", (e: FederatedWheelEvent) => this._onWheel(e));

    this._refreshScrollbars();
  }

  /** Current horizontal scroll offset in pixels (0 = leftmost). */
  public get scrollX(): number {
    return this._scrollX;
  }

  /** Current vertical scroll offset in pixels (0 = topmost). */
  public get scrollY(): number {
    return this._scrollY;
  }

  public get viewportWidth(): number {
    return this._viewportWidth;
  }

  public get viewportHeight(): number {
    return this._viewportHeight;
  }

  /** Width of the current scrollable content (set by `refresh` / `setContentSize`). */
  public get contentWidth(): number {
    return this._contentWidth;
  }

  /** Height of the current scrollable content. */
  public get contentHeight(): number {
    return this._contentHeight;
  }

  /** Maximum legal `scrollX` (= `contentWidth - viewportWidth`, clamped at 0). */
  public get scrollableWidth(): number {
    return Math.max(0, this._contentWidth - this._viewportWidth);
  }

  /** Maximum legal `scrollY`. */
  public get scrollableHeight(): number {
    return Math.max(0, this._contentHeight - this._viewportHeight);
  }

  /**
   * Set the scroll offset. Values are clamped to `[0, scrollable*]`
   * and the disabled axis is forced to 0. Fires `onScroll` when the
   * effective offset changes.
   */
  public scrollTo(x: number, y: number): void {
    const sx = this._direction === "vertical" ? 0 : this._clamp(x, this.scrollableWidth);
    const sy = this._direction === "horizontal" ? 0 : this._clamp(y, this.scrollableHeight);
    if (sx === this._scrollX && sy === this._scrollY) return;
    this._scrollX = sx;
    this._scrollY = sy;
    this.content.position.set(-sx, -sy);
    this._refreshScrollbars();
    for (const cb of this._scrollListeners) cb(sx, sy);
  }

  /** Add `(dx, dy)` to the current scroll offset. */
  public scrollBy(dx: number, dy: number): void {
    this.scrollTo(this._scrollX + dx, this._scrollY + dy);
  }

  /**
   * Recompute content size from `content.getLocalBounds()`. Call
   * after adding, removing, or resizing scrollable children so the
   * scroll clamp and scrollbar match the new layout.
   */
  public refresh(): void {
    const bounds = this.content.getLocalBounds();
    this.setContentSize(Math.max(0, bounds.right), Math.max(0, bounds.bottom));
  }

  /**
   * Set content size explicitly. Use this when you already know the
   * content's dimensions (e.g. you laid the children out yourself)
   * and want to skip the `getLocalBounds()` measurement.
   */
  public setContentSize(width: number, height: number): void {
    this._contentWidth = Math.max(0, width);
    this._contentHeight = Math.max(0, height);
    // Re-clamp current scroll in case content shrank past it.
    this.scrollTo(this._scrollX, this._scrollY);
    this._refreshScrollbars();
  }

  /** Subscribe to scroll-offset changes. Returns an unsubscribe function. */
  public onScroll(cb: (x: number, y: number) => void): Unsubscribe {
    this._scrollListeners.add(cb);
    return () => this._scrollListeners.delete(cb);
  }

  public override destroy(opts?: DestroyOptions): void {
    this._scrollListeners.clear();
    super.destroy(opts);
  }

  // ── Internals ──────────────────────────────────────────────────────

  private _buildScrollbar(axis: "v" | "h"): {
    container: Container;
    track: Sprite | NineSliceSprite;
    thumb: Sprite | NineSliceSprite;
  } {
    const container = new Container();
    container.eventMode = "static";
    container.cursor = "pointer";
    // Build the track + thumb sprites using `_buildStyledSprite` so 9-slice
    // border kicks in when configured. The slot dimensions passed here
    // are placeholder 1×1 sizes; `_layoutVerticalScrollbar` /
    // `_layoutHorizontalScrollbar` resize them on every redraw.
    const track = this._buildStyledSprite(this._trackStyle, 1);
    track.anchor.set(0, 0);
    track.eventMode = "none";
    container.addChild(track);

    const thumb = this._buildStyledSprite(this._thumbStyle, 1);
    thumb.anchor.set(0, 0);
    thumb.eventMode = "none";
    container.addChild(thumb);

    container.on("pointerdown", (e: FederatedPointerEvent) => (axis === "v" ? this._onScrollbarPressedV(e) : this._onScrollbarPressedH(e)));
    this.addChild(container);
    return { container, track, thumb };
  }

  private _clamp(value: number, max: number): number {
    if (max <= 0) return 0;
    return Math.max(0, Math.min(max, value));
  }

  private _onPointerDown(e: FederatedPointerEvent): void {
    if (!this._dragEnabled) return;
    // Only drag when the pointer hits the viewport background — child
    // containers (buttons, list rows, etc.) keep their normal taps.
    // Scrollbar presses set their own drag mode and don't reach here
    // because their `e.target` is a scrollbar Container / sprite, not `this`.
    if (e.target !== this) return;
    this._beginDrag("viewport", e);
  }

  private _onGlobalPointerMove(e: FederatedPointerEvent): void {
    switch (this._dragMode) {
      case "none":
        return;
      case "viewport": {
        const dx = e.global.x - this._dragStartPointerX;
        const dy = e.global.y - this._dragStartPointerY;
        // Drag inverts: pulling content down (positive dy) reveals
        // earlier content (smaller scrollY).
        this.scrollTo(this._dragStartScrollX - dx, this._dragStartScrollY - dy);
        return;
      }
      case "scrollbarV": {
        const dy = e.global.y - this._dragStartPointerY;
        const travel = this._verticalThumbTravel();
        if (travel > 0) {
          const scrollDelta = (dy / travel) * this.scrollableHeight;
          this.scrollTo(this._dragStartScrollX, this._dragStartScrollY + scrollDelta);
        }
        return;
      }
      case "scrollbarH": {
        const dx = e.global.x - this._dragStartPointerX;
        const travel = this._horizontalThumbTravel();
        if (travel > 0) {
          const scrollDelta = (dx / travel) * this.scrollableWidth;
          this.scrollTo(this._dragStartScrollX + scrollDelta, this._dragStartScrollY);
        }
        return;
      }
    }
  }

  private _endDrag(): void {
    this._dragMode = "none";
  }

  private _beginDrag(mode: "viewport" | "scrollbarV" | "scrollbarH", e: FederatedPointerEvent): void {
    this._dragMode = mode;
    this._dragStartPointerX = e.global.x;
    this._dragStartPointerY = e.global.y;
    this._dragStartScrollX = this._scrollX;
    this._dragStartScrollY = this._scrollY;
  }

  private _onScrollbarPressedV(e: FederatedPointerEvent): void {
    if (this.scrollableHeight <= 0) return;
    const local = e.getLocalPosition(this);
    const trackHeight = this._verticalTrackHeight();
    const thumbHeight = this._verticalThumbHeight();
    const travel = trackHeight - thumbHeight;
    const thumbTop = this._scrollbarMargin + (travel > 0 ? travel * (this._scrollY / this.scrollableHeight) : 0);
    const thumbBottom = thumbTop + thumbHeight;

    // Tap on the track outside the thumb → jump-to-position so the
    // thumb is roughly centered on the click. Then continue as a
    // thumb drag from the new position so the user can keep adjusting
    // without releasing.
    if (local.y < thumbTop || local.y > thumbBottom) {
      const targetTop = local.y - thumbHeight / 2 - this._scrollbarMargin;
      const clamped = Math.max(0, Math.min(travel, targetTop));
      const targetScrollY = travel > 0 ? (clamped / travel) * this.scrollableHeight : 0;
      this.scrollTo(this._scrollX, targetScrollY);
    }

    this._beginDrag("scrollbarV", e);
  }

  private _onScrollbarPressedH(e: FederatedPointerEvent): void {
    if (this.scrollableWidth <= 0) return;
    const local = e.getLocalPosition(this);
    const trackWidth = this._horizontalTrackWidth();
    const thumbWidth = this._horizontalThumbWidth();
    const travel = trackWidth - thumbWidth;
    const thumbLeft = this._scrollbarMargin + (travel > 0 ? travel * (this._scrollX / this.scrollableWidth) : 0);
    const thumbRight = thumbLeft + thumbWidth;

    if (local.x < thumbLeft || local.x > thumbRight) {
      const targetLeft = local.x - thumbWidth / 2 - this._scrollbarMargin;
      const clamped = Math.max(0, Math.min(travel, targetLeft));
      const targetScrollX = travel > 0 ? (clamped / travel) * this.scrollableWidth : 0;
      this.scrollTo(targetScrollX, this._scrollY);
    }

    this._beginDrag("scrollbarH", e);
  }

  private _onWheel(e: FederatedWheelEvent): void {
    let dx: number;
    let dy: number;
    if (this._direction === "horizontal") {
      // Map both wheel axes onto horizontal scroll — a standard mouse's
      // vertical wheel would otherwise feel frozen on a horizontal-only
      // view. Trackpad horizontal swipes (deltaX) still work too.
      dx = ((e.deltaX + e.deltaY) * this._wheelSpeed) / 100;
      dy = 0;
    } else if (this._direction === "vertical") {
      dx = 0;
      dy = (e.deltaY * this._wheelSpeed) / 100;
    } else {
      dx = (e.deltaX * this._wheelSpeed) / 100;
      dy = (e.deltaY * this._wheelSpeed) / 100;
    }
    if (dx === 0 && dy === 0) return;
    const beforeX = this._scrollX;
    const beforeY = this._scrollY;
    this.scrollBy(dx, dy);
    // Only stop propagation when we actually consumed scroll, so a
    // scroll view that's already pinned at its edge doesn't swallow
    // the page's wheel scroll.
    if (this._scrollX !== beforeX || this._scrollY !== beforeY) {
      e.preventDefault();
    }
  }

  private _refreshScrollbars(): void {
    this._layoutVerticalScrollbar();
    this._layoutHorizontalScrollbar();
  }

  private _layoutVerticalScrollbar(): void {
    const container = this._scrollbarV;
    const track = this._trackV;
    const thumb = this._thumbV;
    if (!container || !track || !thumb) return;

    if (this.scrollableHeight <= 0) {
      container.visible = false;
      return;
    }
    container.visible = true;

    const trackHeight = this._verticalTrackHeight();
    const thumbHeight = this._verticalThumbHeight();
    const travel = trackHeight - thumbHeight;
    const thumbY = this._scrollbarMargin + (travel > 0 ? travel * (this._scrollY / this.scrollableHeight) : 0);
    const trackX = this._viewportWidth - this._scrollbarThickness - this._scrollbarMargin;
    // Thumb is centred on the track centreline so a thumbThickness >
    // scrollbarThickness overflows symmetrically on both sides.
    const thumbX = trackX + (this._scrollbarThickness - this._thumbThickness) / 2;

    // Sprites use top-left anchor (set in `_buildScrollbar`); position
    // is the top-left corner, not the centre.
    this._applyPartialSpriteStyle(track, this._trackStyle, this._scrollbarThickness, trackHeight);
    track.position.set(trackX, this._scrollbarMargin);

    this._applyPartialSpriteStyle(thumb, this._thumbStyle, this._thumbThickness, thumbHeight);
    thumb.position.set(thumbX, thumbY);

    // Hit area covers the union of track + thumb on the cross-axis so
    // the protruding parts of a wider thumb stay grabbable.
    const hitX = Math.min(trackX, thumbX);
    const hitW = Math.max(this._scrollbarThickness, this._thumbThickness);
    container.hitArea = new Rectangle(hitX, this._scrollbarMargin, hitW, trackHeight);
  }

  private _layoutHorizontalScrollbar(): void {
    const container = this._scrollbarH;
    const track = this._trackH;
    const thumb = this._thumbH;
    if (!container || !track || !thumb) return;

    if (this.scrollableWidth <= 0) {
      container.visible = false;
      return;
    }
    container.visible = true;

    const trackWidth = this._horizontalTrackWidth();
    const thumbWidth = this._horizontalThumbWidth();
    const travel = trackWidth - thumbWidth;
    const thumbX = this._scrollbarMargin + (travel > 0 ? travel * (this._scrollX / this.scrollableWidth) : 0);
    const trackY = this._viewportHeight - this._scrollbarThickness - this._scrollbarMargin;
    const thumbY = trackY + (this._scrollbarThickness - this._thumbThickness) / 2;

    // Sprites use top-left anchor (set in `_buildScrollbar`); position
    // is the top-left corner, not the centre.
    this._applyPartialSpriteStyle(track, this._trackStyle, trackWidth, this._scrollbarThickness);
    track.position.set(this._scrollbarMargin, trackY);

    this._applyPartialSpriteStyle(thumb, this._thumbStyle, thumbWidth, this._thumbThickness);
    thumb.position.set(thumbX, thumbY);

    const hitY = Math.min(trackY, thumbY);
    const hitH = Math.max(this._scrollbarThickness, this._thumbThickness);
    container.hitArea = new Rectangle(this._scrollbarMargin, hitY, trackWidth, hitH);
  }

  private _verticalTrackHeight(): number {
    return this._viewportHeight - this._scrollbarMargin * 2;
  }

  private _verticalThumbHeight(): number {
    if (this._contentHeight <= 0) return 0;
    const trackHeight = this._verticalTrackHeight();
    if (this._thumbLength !== null) {
      // Fixed length, clamped so the thumb still fits inside the track.
      return Math.min(trackHeight, this._thumbLength);
    }
    const ratio = this._viewportHeight / this._contentHeight;
    return Math.max(20, trackHeight * ratio);
  }

  private _verticalThumbTravel(): number {
    return this._verticalTrackHeight() - this._verticalThumbHeight();
  }

  private _horizontalTrackWidth(): number {
    return this._viewportWidth - this._scrollbarMargin * 2;
  }

  private _horizontalThumbWidth(): number {
    if (this._contentWidth <= 0) return 0;
    const trackWidth = this._horizontalTrackWidth();
    if (this._thumbLength !== null) {
      return Math.min(trackWidth, this._thumbLength);
    }
    const ratio = this._viewportWidth / this._contentWidth;
    return Math.max(20, trackWidth * ratio);
  }

  private _horizontalThumbTravel(): number {
    return this._horizontalTrackWidth() - this._horizontalThumbWidth();
  }
}
