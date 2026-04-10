import type { LayoutOptions } from "@pixi/layout";
import * as PIXI from "pixi.js";
import { Button } from "@pixi/ui";
import type { Unsubscribe } from "../../../core/events/subscriptions.js";
import type { IAssetManager } from "../../../core/assets/IAssetManager.js";

export type ButtonComponentPreset = {
  /** X position. */
  x?: number;
  /** Y position. */
  y?: number;
  /** Fixed width. Ignored when the parent layout controls sizing. */
  width?: number;
  /** Fixed height. Ignored when the parent layout controls sizing. */
  height?: number;
  /** Label text. Omit for an icon-only button. */
  label?: string;
  /** Label style overrides merged on top of the defaults. */
  labelStyle?: Partial<PIXI.TextStyleOptions>;
  /** Corner radius for the placeholder background. @default 12 */
  radius?: number;
  /** Placeholder fill color. @default 0x111827 */
  fillColor?: number;
  /** Placeholder fill alpha. @default 0.92 */
  fillAlpha?: number;
  /** Placeholder stroke color. @default 0x334155 */
  strokeColor?: number;
  /** Placeholder stroke width. @default 1 */
  strokeWidth?: number;
  /** Asset ID for the background texture. Resolved via `resolveAssets()`. */
  bgTextureId?: string;
};

/**
 * Parse a JSON string into ButtonComponentPreset.
 * All fields are JSON-safe primitives (numbers, strings).
 */
export function parseButtonComponentPreset(json: string): ButtonComponentPreset {
  return JSON.parse(json) as ButtonComponentPreset;
}

const DEFAULT_LABEL_STYLE: Partial<PIXI.TextStyleOptions> = {
  fill: 0xe8eef6,
  fontSize: 16,
  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
  fontWeight: "600",
};

/**
 * Reusable Pixi button component.
 *
 * - Renders a rounded-rect placeholder background that redraws on layout changes.
 * - Optionally displays a background texture (set via `setTexture`) that replaces the placeholder.
 * - Optionally displays a centered label.
 * - Wraps `@pixi/ui` `Button` for press handling.
 * - `onPress(cb)` returns an `Unsubscribe` for easy cleanup.
 */
export class ButtonComponent extends PIXI.Container {
  private readonly _placeholder: PIXI.Graphics;
  private readonly _bgSprite: PIXI.Sprite;
  private readonly _label: PIXI.Text | null;
  private readonly _button: Button;
  private readonly _opts: Required<
    Pick<ButtonComponentPreset, "radius" | "fillColor" | "fillAlpha" | "strokeColor" | "strokeWidth">
  >;
  private readonly _bgTextureId: string | undefined;

  private _layoutWidth = 0;
  private _layoutHeight = 0;

  constructor(opts: ButtonComponentPreset = {}) {
    super();

    this._opts = {
      radius: opts.radius ?? 12,
      fillColor: opts.fillColor ?? 0x111827,
      fillAlpha: opts.fillAlpha ?? 0.92,
      strokeColor: opts.strokeColor ?? 0x334155,
      strokeWidth: opts.strokeWidth ?? 1,
    };
    this._bgTextureId = opts.bgTextureId;

    // Placeholder background
    this._placeholder = new PIXI.Graphics();
    this._placeholder.layout = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" };
    this.addChild(this._placeholder);

    // Texture background (hidden until a texture is set)
    this._bgSprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
    this._bgSprite.layout = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" };
    this._bgSprite.visible = false;
    this.addChild(this._bgSprite);

    // Label
    if (opts.label !== undefined) {
      const mergedStyle = { ...DEFAULT_LABEL_STYLE, ...opts.labelStyle };
      this._label = new PIXI.Text({ text: opts.label, style: mergedStyle });
      this._label.anchor.set(0.5, 0.5);
      this._label.layout = {};
      this.addChild(this._label);
    } else {
      this._label = null;
    }

    // Position
    if (opts.x !== undefined) this.x = opts.x;
    if (opts.y !== undefined) this.y = opts.y;

    // Layout
    const layout: Omit<LayoutOptions, "target"> = { justifyContent: "center", alignItems: "center" };
    if (opts.width !== undefined) layout.width = opts.width;
    if (opts.height !== undefined) layout.height = opts.height;
    this.layout = layout;

    this.on("layout", (l: any) => {
      const w = Math.max(1, Math.floor(l.computedLayout.width));
      const h = Math.max(1, Math.floor(l.computedLayout.height));
      this._layoutWidth = w;
      this._layoutHeight = h;
      this.redrawPlaceholder(w, h);
      this.applySpriteSize(w, h);
    });

    // @pixi/ui Button wrapper
    this._button = new Button(this);
  }

  /** Replace the placeholder with a texture background. */
  public setTexture(texture: PIXI.Texture): void {
    this._bgSprite.texture = texture;
    this._bgSprite.visible = true;
    this._placeholder.visible = false;
    if (this._layoutWidth > 0 && this._layoutHeight > 0) {
      this.applySpriteSize(this._layoutWidth, this._layoutHeight);
    }
  }

  /** Update the label text. No-op if the button was created without a label. */
  public setLabel(text: string): void {
    if (this._label) this._label.text = text;
  }

  /** Subscribe to press events. Returns an unsubscribe function. */
  public onPress(cb: () => void): Unsubscribe {
    this._button.onPress.connect(cb);
    return () => this._button.onPress.disconnect(cb);
  }

  /** Resolve preset asset references (e.g. bgTextureId) from the asset manager. */
  public resolveAssets(assetManager: IAssetManager): void {
    if (this._bgTextureId) {
      const texture = assetManager.getAsset<PIXI.Texture>(this._bgTextureId);
      if (texture) this.setTexture(texture);
    }
  }

  private redrawPlaceholder(w: number, h: number): void {
    if (!this._placeholder.visible) return;
    this._placeholder.clear();
    this._placeholder
      .roundRect(0, 0, w, h, this._opts.radius)
      .fill({ color: this._opts.fillColor, alpha: this._opts.fillAlpha })
      .stroke({ color: this._opts.strokeColor, width: this._opts.strokeWidth });
  }

  private applySpriteSize(w: number, h: number): void {
    if (this._bgSprite.texture === PIXI.Texture.EMPTY) return;
    this._bgSprite.scale.set(1, 1);
    this._bgSprite.width = w;
    this._bgSprite.height = h;
  }
}
