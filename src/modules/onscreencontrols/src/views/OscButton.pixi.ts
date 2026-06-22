import type { NineSliceSprite, Sprite } from "pixi.js";
import { Graphics } from "pixi.js";
import type { AssetManager } from "../../../../core/assets/AssetManager.js";
import { StyledHudObject } from "../../../../core/styles/StyledHudObject.js";
import type { OscButtonStyle } from "../OnScreenControlTypes.js";

type ProgressRefs = {
  sprite: Sprite | NineSliceSprite;
  mask: Graphics;
  /**
   * Cached max axis scale (= max(scaleX, scaleY) on the resolved
   * progress slot, defaulting to 1 when unset). Drives the circular
   * mask radius so stretched rings stay fully covered by the wedge.
   */
  maxScale: number;
  /** Last drawn t value, so we skip redraw when nothing changed. */
  lastT: number;
};

/**
 * Self-rendering on-screen button. Owns its bg sprite, optional icon,
 * lazy progress ring, and the up/down/disabled state machine.
 *
 * Hosts (typically `OnScreenControlsView`) instantiate one per virtual
 * button, install pointer listeners on the container, and drive the
 * state machine via {@link setDown} / {@link setEnabled}. The style
 * is captured once at construction — runtime restyling is not
 * supported yet (a `changeStyle` API can land when needed).
 *
 * Sprite construction goes through the base class's partial-apply
 * helpers (`_buildStyledSprite` / `_applyPartialSpriteStyle`); missing
 * textures throw with a clear error at construction.
 */
export class OscButton extends StyledHudObject<OscButtonStyle> {
  private readonly _size: number;

  private _bg: Sprite | NineSliceSprite | null = null;
  private _icon: Sprite | NineSliceSprite | null = null;
  /**
   * Resting alpha of the icon (= `style.icon?.alpha ?? 1`). `setEnabled`
   * multiplies this by 0.5 to dim the icon while disabled, then restores
   * to this value on re-enable.
   */
  private _iconRestAlpha = 1;
  private _progress: ProgressRefs | null = null;
  private _pendingProgress = 0;

  private _isDown = false;
  private _enabled = true;

  public get isDown(): boolean {
    return this._isDown;
  }

  public get enabled(): boolean {
    return this._enabled;
  }

  public constructor(assetManager: AssetManager, style: OscButtonStyle, size: number) {
    super(assetManager, style);
    this._size = size;
    this.eventMode = "static";
    this.cursor = "pointer";
    this._refreshBg();
    this._buildIcon();
  }

  /** Marks the button as pressed/released. No-op when disabled. */
  public setDown(down: boolean): void {
    if (!this._enabled && down) return;
    if (this._isDown === down) return;
    this._isDown = down;
    this._refreshBg();
  }

  /** Toggles the button's interactive + visual disabled state. */
  public setEnabled(enabled: boolean): void {
    if (this._enabled === enabled) return;
    this._enabled = enabled;
    if (!enabled && this._isDown) this._isDown = false;
    this.cursor = enabled ? "pointer" : "default";
    this.eventMode = enabled ? "static" : "auto";
    if (this._icon) {
      this._icon.alpha = this._iconRestAlpha * (enabled ? 1 : 0.5);
    }
    this._refreshBg();
  }

  /** Builds (lazily) and shows the progress ring. */
  public showProgress(): void {
    const progress = this._ensureProgress();
    progress.sprite.visible = true;
    progress.mask.visible = true;
    this._drawProgressMask(this._pendingProgress);
  }

  /** Hides the progress ring (no-op if it was never shown). */
  public hideProgress(): void {
    if (!this._progress) return;
    this._progress.sprite.visible = false;
    this._progress.mask.visible = false;
  }

  /** Sets the progress ring sweep, `t` in `[0, 1]`. */
  public setProgress(t: number): void {
    this._pendingProgress = t;
    if (this._progress) this._drawProgressMask(t);
  }

  // ── INTERNAL VISUAL REFRESH ──

  private _refreshBg(): void {
    const state: "up" | "down" | "disabled" = !this._enabled ? "disabled" : this._isDown ? "down" : "up";
    const slot = this._style[state];
    if (!this._bg) {
      this._bg = this._buildStyledSprite(slot, this._size);
      this._bg.position.set(this._size / 2, this._size / 2);
      this.addChild(this._bg);
    } else {
      this._applyPartialSpriteStyle(this._bg, slot, this._size);
    }
  }

  private _buildIcon(): void {
    const slot = this._style.icon;
    if (!slot?.textureId) return;
    this._iconRestAlpha = slot.alpha ?? 1;
    this._icon = this._buildStyledSprite(slot, this._size);
    this._icon.position.set(this._size / 2, this._size / 2);
    this.addChild(this._icon);
  }

  private _ensureProgress(): ProgressRefs {
    if (this._progress) return this._progress;
    const slot = this._style.progress;
    const sprite = this._buildStyledSprite(slot, this._size);
    sprite.position.set(this._size / 2, this._size / 2);
    sprite.visible = false;

    const mask = new Graphics();
    mask.visible = false;
    sprite.mask = mask;

    // Insert behind the bg so the ring's outer halo isn't clipped by
    // the bg sprite's edges.
    this.addChildAt(sprite, 0);
    this.addChildAt(mask, 0);

    const maxScale = Math.max(slot?.scaleX ?? 1, slot?.scaleY ?? 1);
    const progress: ProgressRefs = { sprite, mask, maxScale, lastT: -1 };
    this._progress = progress;
    return progress;
  }

  private _drawProgressMask(t: number): void {
    const progress = this._progress;
    if (!progress) return;
    const clamped = Math.max(0, Math.min(1, t));
    if (progress.lastT === clamped) return;
    progress.lastT = clamped;

    const cx = this._size / 2;
    const cy = this._size / 2;
    // Mask is circular; for stretched rings (scaleX !== scaleY) take
    // the larger axis so the wedge fully covers the visible sprite.
    const radius = (this._size * progress.maxScale) / 2 + 1;
    progress.mask.clear();
    if (clamped <= 0) return;
    if (clamped >= 1) {
      progress.mask.circle(cx, cy, radius).fill({ color: 0xffffff });
      return;
    }
    const start = -Math.PI / 2;
    const end = start + clamped * Math.PI * 2;
    progress.mask.moveTo(cx, cy);
    progress.mask.arc(cx, cy, radius, start, end);
    progress.mask.lineTo(cx, cy);
    progress.mask.fill({ color: 0xffffff });
  }
}
