import type { LayoutOptions } from "@pixi/layout";
import * as PIXI from "pixi.js";
import type { Unsubscribe } from "../../../../core/events/subscriptions.js";

export type ScrollViewDirection = "vertical" | "horizontal" | "both";

export type ScrollViewComponentPreset = {
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
  /** Scrollbar thumb color. @default 0x94a3b8 */
  scrollbarColor?: number;
  /** Scrollbar thumb alpha. @default 0.6 */
  scrollbarAlpha?: number;
  /** Scrollbar thumb thickness in pixels. @default 4 */
  scrollbarThickness?: number;
  /** Distance between scrollbar and viewport edge, in pixels. @default 2 */
  scrollbarMargin?: number;
  /** Pixels scrolled per wheel notch (browser delta is divided by 100). @default 50 */
  wheelSpeed?: number;
  /** Whether dragging on the viewport background pans the content. @default true */
  dragEnabled?: boolean;
};

/**
 * Parse a JSON string into ScrollViewComponentPreset.
 */
export function parseScrollViewComponentPreset(json: string): ScrollViewComponentPreset {
  return JSON.parse(json) as ScrollViewComponentPreset;
}

/**
 * Reusable scrollable container.
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
 *   continues from the new position). Implemented with a single
 *   Graphics per axis that draws a near-transparent track rect (for
 *   hit-testing) plus the visible thumb on top.
 * - Content size is determined by {@link refresh} (reads
 *   `content.getLocalBounds()`) or {@link setContentSize}. Call after
 *   adding/removing children so scroll bounds and the scrollbar
 *   reflect the new layout.
 */
export class ScrollViewComponent extends PIXI.Container {
  /**
   * Public content container — add scrollable children here. The
   * container is translated as the user scrolls; its own children
   * keep their natural local coordinates.
   */
  public readonly content: PIXI.Container;

  private readonly _viewportWidth: number;
  private readonly _viewportHeight: number;
  private readonly _direction: ScrollViewDirection;
  private readonly _wheelSpeed: number;
  private readonly _dragEnabled: boolean;
  private readonly _scrollbarThickness: number;
  private readonly _scrollbarMargin: number;
  private readonly _scrollbarColor: number;
  private readonly _scrollbarAlpha: number;
  private readonly _bg: PIXI.Graphics;
  private readonly _mask: PIXI.Graphics;
  private readonly _scrollbarV: PIXI.Graphics | null;
  private readonly _scrollbarH: PIXI.Graphics | null;
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

  public constructor(opts: ScrollViewComponentPreset) {
    super();

    if (opts.x !== undefined) this.x = opts.x;
    if (opts.y !== undefined) this.y = opts.y;

    this._viewportWidth = opts.width;
    this._viewportHeight = opts.height;
    this._direction = opts.direction ?? "vertical";
    this._wheelSpeed = opts.wheelSpeed ?? 50;
    this._dragEnabled = opts.dragEnabled ?? true;
    this._scrollbarThickness = opts.scrollbarThickness ?? 4;
    this._scrollbarMargin = opts.scrollbarMargin ?? 2;
    this._scrollbarColor = opts.scrollbarColor ?? 0x94a3b8;
    this._scrollbarAlpha = opts.scrollbarAlpha ?? 0.6;
    const showScrollbar = opts.showScrollbar ?? true;

    this._bg = new PIXI.Graphics();
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
    this._mask = new PIXI.Graphics();
    this._mask.rect(0, 0, this._viewportWidth, this._viewportHeight).fill({ color: 0xffffff });
    this.addChild(this._mask);

    this.content = new PIXI.Container();
    this.content.mask = this._mask;
    this.addChild(this.content);

    this._scrollbarV = showScrollbar && this._direction !== "horizontal" ? this._makeScrollbar("v") : null;
    this._scrollbarH = showScrollbar && this._direction !== "vertical" ? this._makeScrollbar("h") : null;

    const layout: Omit<LayoutOptions, "target"> = {
      width: this._viewportWidth,
      height: this._viewportHeight,
    };
    this.layout = layout;

    this.eventMode = "static";
    this.hitArea = new PIXI.Rectangle(0, 0, this._viewportWidth, this._viewportHeight);
    this.on("pointerdown", (e: PIXI.FederatedPointerEvent) => this._onPointerDown(e));
    this.on("globalpointermove", (e: PIXI.FederatedPointerEvent) => this._onGlobalPointerMove(e));
    this.on("pointerup", () => this._endDrag());
    this.on("pointerupoutside", () => this._endDrag());
    this.on("wheel", (e: PIXI.FederatedWheelEvent) => this._onWheel(e));

    this._redrawScrollbars();
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
    this._redrawScrollbars();
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
    this._redrawScrollbars();
  }

  /** Subscribe to scroll-offset changes. Returns an unsubscribe function. */
  public onScroll(cb: (x: number, y: number) => void): Unsubscribe {
    this._scrollListeners.add(cb);
    return () => this._scrollListeners.delete(cb);
  }

  public override destroy(opts?: PIXI.DestroyOptions): void {
    this._scrollListeners.clear();
    super.destroy(opts);
  }

  // ── Internals ──────────────────────────────────────────────────────

  private _makeScrollbar(axis: "v" | "h"): PIXI.Graphics {
    const bar = new PIXI.Graphics();
    // Each bar draws an invisible (alpha 0.001) full-track rect plus
    // the visible thumb, so the entire track region is hit-testable.
    // pointerdown distinguishes thumb (drag) from track (jump-to).
    bar.eventMode = "static";
    bar.cursor = "pointer";
    bar.on("pointerdown", (e: PIXI.FederatedPointerEvent) => (axis === "v" ? this._onScrollbarPressedV(e) : this._onScrollbarPressedH(e)));
    this.addChild(bar);
    return bar;
  }

  private _clamp(value: number, max: number): number {
    if (max <= 0) return 0;
    return Math.max(0, Math.min(max, value));
  }

  private _onPointerDown(e: PIXI.FederatedPointerEvent): void {
    if (!this._dragEnabled) return;
    // Only drag when the pointer hits the viewport background — child
    // containers (buttons, list rows, etc.) keep their normal taps.
    // Scrollbar presses set their own drag mode and don't reach here
    // because their `e.target` is the scrollbar Graphics, not `this`.
    if (e.target !== this) return;
    this._beginDrag("viewport", e);
  }

  private _onGlobalPointerMove(e: PIXI.FederatedPointerEvent): void {
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

  private _beginDrag(mode: "viewport" | "scrollbarV" | "scrollbarH", e: PIXI.FederatedPointerEvent): void {
    this._dragMode = mode;
    this._dragStartPointerX = e.global.x;
    this._dragStartPointerY = e.global.y;
    this._dragStartScrollX = this._scrollX;
    this._dragStartScrollY = this._scrollY;
  }

  private _onScrollbarPressedV(e: PIXI.FederatedPointerEvent): void {
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

  private _onScrollbarPressedH(e: PIXI.FederatedPointerEvent): void {
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

  private _onWheel(e: PIXI.FederatedWheelEvent): void {
    const dx = this._direction === "vertical" ? 0 : (e.deltaX * this._wheelSpeed) / 100;
    const dy = this._direction === "horizontal" ? 0 : (e.deltaY * this._wheelSpeed) / 100;
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

  private _redrawScrollbars(): void {
    if (this._scrollbarV) this._drawVerticalScrollbar();
    if (this._scrollbarH) this._drawHorizontalScrollbar();
  }

  private _drawVerticalScrollbar(): void {
    const bar = this._scrollbarV;
    if (!bar) return;
    bar.clear();
    if (this.scrollableHeight <= 0) return;

    const trackHeight = this._verticalTrackHeight();
    const thumbHeight = this._verticalThumbHeight();
    const travel = trackHeight - thumbHeight;
    const thumbY = this._scrollbarMargin + (travel > 0 ? travel * (this._scrollY / this.scrollableHeight) : 0);
    const thumbX = this._viewportWidth - this._scrollbarThickness - this._scrollbarMargin;

    // Invisible track rect — fills the full track region with a near-
    // zero alpha so it's hit-testable without being visible. Lets the
    // user click the track to jump-scroll without obscuring content.
    bar.rect(thumbX, this._scrollbarMargin, this._scrollbarThickness, trackHeight).fill({ color: 0x000000, alpha: 0.001 });

    // Visible thumb on top.
    bar
      .roundRect(thumbX, thumbY, this._scrollbarThickness, thumbHeight, this._scrollbarThickness / 2)
      .fill({ color: this._scrollbarColor, alpha: this._scrollbarAlpha });
  }

  private _drawHorizontalScrollbar(): void {
    const bar = this._scrollbarH;
    if (!bar) return;
    bar.clear();
    if (this.scrollableWidth <= 0) return;

    const trackWidth = this._horizontalTrackWidth();
    const thumbWidth = this._horizontalThumbWidth();
    const travel = trackWidth - thumbWidth;
    const thumbX = this._scrollbarMargin + (travel > 0 ? travel * (this._scrollX / this.scrollableWidth) : 0);
    const thumbY = this._viewportHeight - this._scrollbarThickness - this._scrollbarMargin;

    bar.rect(this._scrollbarMargin, thumbY, trackWidth, this._scrollbarThickness).fill({ color: 0x000000, alpha: 0.001 });

    bar
      .roundRect(thumbX, thumbY, thumbWidth, this._scrollbarThickness, this._scrollbarThickness / 2)
      .fill({ color: this._scrollbarColor, alpha: this._scrollbarAlpha });
  }

  private _verticalTrackHeight(): number {
    return this._viewportHeight - this._scrollbarMargin * 2;
  }

  private _verticalThumbHeight(): number {
    if (this._contentHeight <= 0) return 0;
    const ratio = this._viewportHeight / this._contentHeight;
    return Math.max(20, this._verticalTrackHeight() * ratio);
  }

  private _verticalThumbTravel(): number {
    return this._verticalTrackHeight() - this._verticalThumbHeight();
  }

  private _horizontalTrackWidth(): number {
    return this._viewportWidth - this._scrollbarMargin * 2;
  }

  private _horizontalThumbWidth(): number {
    if (this._contentWidth <= 0) return 0;
    const ratio = this._viewportWidth / this._contentWidth;
    return Math.max(20, this._horizontalTrackWidth() * ratio);
  }

  private _horizontalThumbTravel(): number {
    return this._horizontalTrackWidth() - this._horizontalThumbWidth();
  }
}
