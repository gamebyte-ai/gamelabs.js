import * as PIXI from "pixi.js";
import type { AssetManager } from "../../../../core/assets/AssetManager.js";
import { StyledHudObject } from "../../../../core/styles/StyledHudObject.js";
import type { SpriteStyle } from "../../../../core/styles/SpriteStyle.js";
import type { OscButtonStyle } from "../OnScreenControlTypes.js";
import { OnScreenControlsAssetIds } from "../OnScreenControlsAssetIds.js";

type ProgressRefs = {
  sprite: PIXI.Sprite;
  mask: PIXI.Graphics;
  visual: Required<SpriteStyle>;
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
 * Sprite construction goes through the base class's
 * `_buildSprite` / `_applySpriteStyle` helpers; missing textures
 * throw with a clear error at construction.
 */
export class OscButton extends StyledHudObject<OscButtonStyle> {
  private readonly _size: number;

  private _bg: PIXI.Sprite | null = null;
  private _icon: PIXI.Sprite | null = null;
  private _iconVisual: Required<SpriteStyle> | null = null;
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
    if (this._icon && this._iconVisual) {
      this._icon.alpha = this._iconVisual.alpha * (enabled ? 1 : 0.5);
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
    const visual = this._resolveSpriteStyle(this._style[state], OnScreenControlsAssetIds.ButtonBg, 0xffffff, 1, 1, 1);
    if (!this._bg) {
      this._bg = this._buildSprite(visual, this._size);
      this._bg.position.set(this._size / 2, this._size / 2);
      this.addChild(this._bg);
    } else {
      this._applySpriteStyle(this._bg, visual, this._size);
    }
  }

  private _buildIcon(): void {
    const v = this._style.icon;
    if (!v?.textureId) return;
    // Pass the user-supplied textureId as the "default" — guaranteed
    // truthy by the early return above.
    const visual = this._resolveSpriteStyle(v, v.textureId, 0xffffff, 1, 0.6, 0.6);
    this._iconVisual = visual;
    this._icon = this._buildSprite(visual, this._size);
    this._icon.position.set(this._size / 2, this._size / 2);
    this.addChild(this._icon);
  }

  private _ensureProgress(): ProgressRefs {
    if (this._progress) return this._progress;
    const visual = this._resolveSpriteStyle(this._style.progress, OnScreenControlsAssetIds.ButtonProgress, 0xffffff, 0.85, 1.1, 1.1);
    const sprite = this._buildSprite(visual, this._size);
    sprite.position.set(this._size / 2, this._size / 2);
    sprite.visible = false;

    const mask = new PIXI.Graphics();
    mask.visible = false;
    sprite.mask = mask;

    // Insert behind the bg so the ring's outer halo isn't clipped by
    // the bg sprite's edges.
    this.addChildAt(sprite, 0);
    this.addChildAt(mask, 0);

    const progress: ProgressRefs = { sprite, mask, visual, lastT: -1 };
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
    const radius = (this._size * Math.max(progress.visual.scaleX, progress.visual.scaleY)) / 2 + 1;
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
