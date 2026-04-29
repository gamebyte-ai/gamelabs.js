import * as PIXI from "pixi.js";
import type { Unsubscribe } from "../../../../core/events/subscriptions.js";
import type { IAssetManager } from "../../../../core/assets/IAssetManager.js";
import { UIComponentsAssetIds } from "../UIComponentsAssetIds.js";

/**
 * Asset-id map for the slider's three visual parts. All fields are
 * required so a custom skin must supply art for each piece — falling
 * back across parts (e.g. thumb → track) would conflate semantics.
 */
export type SliderSkin = {
  track: string;
  fill: string;
  thumb: string;
};

export type SliderComponentPreset = {
  /** Track width. @default 140 */
  trackWidth?: number;
  /** Track height. @default 6 */
  trackHeight?: number;
  /** Thumb radius. @default 10 */
  thumbRadius?: number;
  /** Minimum value. @default 0 */
  min?: number;
  /** Maximum value. @default 1 */
  max?: number;
  /** Step size. 0 for continuous. @default 0 */
  step?: number;
  /** Initial value. @default 0 */
  value?: number;
  /**
   * Skin override. Each field is an asset id resolved through `IAssetManager`.
   * Omit to use the framework's default skin (provided by `UIComponentsBinding`).
   */
  skin?: SliderSkin;
  /**
   * Symmetric 9-slice border thickness for the track and fill sprites,
   * in source-texture pixels. When greater than 0 the track/fill render
   * via `PIXI.NineSliceSprite` so a skin's border stays crisp at any
   * track length. The thumb is always a plain stretched sprite.
   *
   * Defaults to 2 with the framework default skin (whose PNGs ship with
   * a 2px black border) and 0 with custom skins. Set explicitly to opt
   * in or out for a custom skin.
   */
  border?: number;
};

/**
 * Parse a JSON string into SliderComponentPreset.
 */
export function parseSliderComponentPreset(json: string): SliderComponentPreset {
  return JSON.parse(json) as SliderComponentPreset;
}

const DEFAULT_SKIN: SliderSkin = {
  track: UIComponentsAssetIds.DefaultSliderTrack,
  fill: UIComponentsAssetIds.DefaultSliderFill,
  thumb: UIComponentsAssetIds.DefaultSliderThumb,
};

/**
 * Reusable slider component.
 *
 * Renders three textured sprites — full-length track, value-driven fill,
 * draggable thumb — whose textures come from a `SliderSkin` asset-id
 * map. The framework's `UIComponentsBinding` ships a default skin so
 * apps don't have to provide art; override per-slider via the `skin`
 * preset field, or at runtime via `setSkin()`.
 *
 * Tap on the track or drag the thumb to change value. Subscribers via
 * `onChange(cb)` receive a numeric value clamped to `[min, max]` and
 * snapped to `step` (when `step > 0`).
 */
export class SliderComponent extends PIXI.Container {
  private readonly _trackHost: PIXI.Container;
  private readonly _trackSprite: PIXI.Sprite | PIXI.NineSliceSprite;
  private readonly _fillSprite: PIXI.Sprite | PIXI.NineSliceSprite;
  private readonly _thumb: PIXI.Sprite;
  private readonly _trackWidth: number;
  private readonly _trackHeight: number;
  private readonly _thumbRadius: number;
  private readonly _min: number;
  private readonly _max: number;
  private readonly _step: number;
  private readonly _changeListeners = new Set<(value: number) => void>();

  private _skin: SliderSkin;
  private _value: number;
  private _dragging = false;

  public constructor(opts: SliderComponentPreset = {}) {
    super();

    this._trackWidth = opts.trackWidth ?? 140;
    this._trackHeight = opts.trackHeight ?? 6;
    this._thumbRadius = opts.thumbRadius ?? 10;
    this._min = opts.min ?? 0;
    this._max = opts.max ?? 1;
    this._step = opts.step ?? 0;
    this._value = opts.value ?? this._min;

    this._skin = opts.skin ?? DEFAULT_SKIN;
    // Default-skin PNGs ship with a 2px black border; opt them into 9-slice
    // automatically so the border stays crisp at any track length. Custom
    // skins default to 0 (plain stretch); the consumer opts in by setting
    // `border` explicitly.
    const border = opts.border ?? (opts.skin ? 0 : 2);

    this.eventMode = "static";

    // Track host sized to the full track box; sprites position relative
    // to it so the rendering origin matches the legacy primitive layout
    // (thumb centered at y=0, track top at y=-trackHeight/2).
    this._trackHost = new PIXI.Container();
    this._trackHost.eventMode = "static";
    this._trackHost.position.set(0, 0);
    this.addChild(this._trackHost);

    const makeStretchSprite = (): PIXI.Sprite | PIXI.NineSliceSprite =>
      border > 0
        ? new PIXI.NineSliceSprite({
            texture: PIXI.Texture.EMPTY,
            leftWidth: border,
            topHeight: border,
            rightWidth: border,
            bottomHeight: border,
          })
        : new PIXI.Sprite(PIXI.Texture.EMPTY);

    this._trackSprite = makeStretchSprite();
    this._trackSprite.position.set(0, -this._trackHeight / 2);
    this._trackSprite.visible = false;
    this._trackHost.addChild(this._trackSprite);

    this._fillSprite = makeStretchSprite();
    this._fillSprite.position.set(0, -this._trackHeight / 2);
    this._fillSprite.visible = false;
    this._trackHost.addChild(this._fillSprite);

    this._thumb = new PIXI.Sprite(PIXI.Texture.EMPTY);
    this._thumb.anchor.set(0.5);
    this._thumb.eventMode = "static";
    this._thumb.cursor = "pointer";
    this._thumb.visible = false;
    this.addChild(this._thumb);

    // Hit area on the host so taps anywhere along the track register
    // even when the track texture is still EMPTY (visible=false sprites
    // don't hit-test). Matches the legacy Graphics-track behaviour.
    this._trackHost.hitArea = new PIXI.Rectangle(0, -this._trackHeight / 2, this._trackWidth, this._trackHeight);

    this._trackHost.on("pointerdown", (e: PIXI.FederatedPointerEvent) => this.onTrackPointerDown(e));
    this._thumb.on("pointerdown", () => this.onThumbPointerDown());
    this.on("globalpointermove", (e: PIXI.FederatedPointerEvent) => this.onGlobalPointerMove(e));
    this.on("pointerup", () => this.onPointerUp());
    this.on("pointerupoutside", () => this.onPointerUp());

    this.applyTrackSize();
    this.refreshFillAndThumb();
  }

  public get value(): number {
    return this._value;
  }

  public get min(): number {
    return this._min;
  }

  public get max(): number {
    return this._max;
  }

  public get step(): number {
    return this._step;
  }

  public setValue(value: number): void {
    const clamped = Math.max(this._min, Math.min(this._max, value));
    if (clamped === this._value) return;
    this._value = clamped;
    this.refreshFillAndThumb();
  }

  /** Replace the active skin and re-resolve all three textures. */
  public setSkin(skin: SliderSkin, assetManager: IAssetManager): void {
    this._skin = skin;
    this.resolveAssets(assetManager);
  }

  /** Resolve the active skin's asset ids into textures and apply them. */
  public resolveAssets(assetManager: IAssetManager): void {
    const trackTex = assetManager.getAsset<PIXI.Texture>(this._skin.track) ?? PIXI.Texture.EMPTY;
    const fillTex = assetManager.getAsset<PIXI.Texture>(this._skin.fill) ?? PIXI.Texture.EMPTY;
    const thumbTex = assetManager.getAsset<PIXI.Texture>(this._skin.thumb) ?? PIXI.Texture.EMPTY;

    this._trackSprite.texture = trackTex;
    this._trackSprite.visible = trackTex !== PIXI.Texture.EMPTY;
    this._fillSprite.texture = fillTex;
    this._fillSprite.visible = fillTex !== PIXI.Texture.EMPTY;
    this._thumb.texture = thumbTex;
    this._thumb.visible = thumbTex !== PIXI.Texture.EMPTY;

    this.applyTrackSize();
    this.refreshFillAndThumb();
  }

  /** Subscribe to value changes. Returns an unsubscribe function. */
  public onChange(cb: (value: number) => void): Unsubscribe {
    this._changeListeners.add(cb);
    return () => this._changeListeners.delete(cb);
  }

  private onTrackPointerDown(e: PIXI.FederatedPointerEvent): void {
    this._dragging = true;
    this.updateFromGlobalX(e.global.x);
  }

  private onThumbPointerDown(): void {
    this._dragging = true;
  }

  private onGlobalPointerMove(e: PIXI.FederatedPointerEvent): void {
    if (this._dragging) this.updateFromGlobalX(e.global.x);
  }

  private onPointerUp(): void {
    this._dragging = false;
  }

  private updateFromGlobalX(globalX: number): void {
    const localX = globalX - this._trackHost.getGlobalPosition().x;
    const ratio = Math.max(0, Math.min(1, localX / this._trackWidth));
    const raw = this._min + ratio * (this._max - this._min);
    const stepped = this._step > 0 ? Math.round(raw / this._step) * this._step : raw;
    const clamped = Math.max(this._min, Math.min(this._max, stepped));

    if (clamped === this._value) return;
    this._value = clamped;
    this.refreshFillAndThumb();
    for (const cb of this._changeListeners) cb(this._value);
  }

  private applyTrackSize(): void {
    if (this._trackSprite.texture !== PIXI.Texture.EMPTY) {
      if (this._trackSprite instanceof PIXI.Sprite) this._trackSprite.scale.set(1, 1);
      this._trackSprite.width = this._trackWidth;
      this._trackSprite.height = this._trackHeight;
    }
  }

  private refreshFillAndThumb(): void {
    const ratio = this._max > this._min ? (this._value - this._min) / (this._max - this._min) : 0;
    const filledW = ratio * this._trackWidth;

    if (this._fillSprite.texture !== PIXI.Texture.EMPTY) {
      if (this._fillSprite instanceof PIXI.Sprite) this._fillSprite.scale.set(1, 1);
      this._fillSprite.width = Math.max(0, filledW);
      this._fillSprite.height = this._trackHeight;
    }

    if (this._thumb.texture !== PIXI.Texture.EMPTY) {
      const diameter = this._thumbRadius * 2;
      this._thumb.width = diameter;
      this._thumb.height = diameter;
    }
    this._thumb.position.set(filledW, 0);
  }
}
