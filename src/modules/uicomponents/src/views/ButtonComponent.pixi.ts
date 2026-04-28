import type { Layout, LayoutOptions } from "@pixi/layout";
import * as PIXI from "pixi.js";
import { Button } from "@pixi/ui";
import type { Unsubscribe } from "../../../../core/events/subscriptions.js";
import type { IAssetManager } from "../../../../core/assets/IAssetManager.js";
import { UIComponentsAssetIds } from "../UIComponentsAssetIds.js";

/**
 * Asset-id map for a button's visual states. `idle` is required; the
 * other three states fall back to `idle` if their texture is unset or
 * has not been loaded into the asset manager.
 */
export type ButtonSkin = {
  idle: string;
  hover?: string;
  pressed?: string;
  disabled?: string;
};

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
  /**
   * Skin override. Each field is an asset id resolved through `IAssetManager`.
   * Omit to use the framework's default skin (provided by `UIComponentsBinding`).
   */
  skin?: ButtonSkin;
  /**
   * Symmetric 9-slice border thickness, in source-texture pixels. When
   * greater than 0 the background renders via `PIXI.NineSliceSprite` —
   * the four corners stay at this size while the middle stretches, so a
   * skin's border stays crisp at any button size.
   *
   * Defaults to 2 with the framework default skin (whose PNGs ship with a
   * 2px black border) and 0 with custom skins. Set explicitly to opt in
   * or out for a custom skin.
   */
  border?: number;
};

/**
 * Parse a JSON string into ButtonComponentPreset.
 * All fields are JSON-safe primitives (numbers, strings, nested objects).
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

const DEFAULT_SKIN: ButtonSkin = {
  idle: UIComponentsAssetIds.DefaultButtonIdle,
  hover: UIComponentsAssetIds.DefaultButtonHover,
  pressed: UIComponentsAssetIds.DefaultButtonPressed,
  disabled: UIComponentsAssetIds.DefaultButtonDisabled,
};

type ButtonState = "idle" | "hover" | "pressed" | "disabled";

/**
 * Reusable Pixi button component.
 *
 * Renders a single background whose texture is swapped on interaction
 * state (idle / hover / pressed / disabled). When `border > 0`, the
 * background is a `PIXI.NineSliceSprite` so corners stay crisp; otherwise
 * it's a plain `PIXI.Sprite` that stretches the texture.
 *
 * Skin textures are referenced by asset id; the framework's
 * `UIComponentsBinding` provides default art so apps don't have to.
 * Override per-button via the `skin` preset field, or at runtime via
 * `setSkin()`.
 *
 * Pointer / keyboard interaction is delegated to `@pixi/ui` `Button`;
 * `onPress(cb)` returns an `Unsubscribe`. Disabling stops `onPress`
 * from firing and swaps to the `disabled` texture.
 */
export class ButtonComponent extends PIXI.Container {
  private readonly _bgSprite: PIXI.Sprite | PIXI.NineSliceSprite;
  private readonly _label: PIXI.Text | null;
  private readonly _button: Button;

  private _skin: ButtonSkin;
  private readonly _textures: Record<ButtonState, PIXI.Texture> = {
    idle: PIXI.Texture.EMPTY,
    hover: PIXI.Texture.EMPTY,
    pressed: PIXI.Texture.EMPTY,
    disabled: PIXI.Texture.EMPTY,
  };

  private _state: ButtonState = "idle";
  private _enabled = true;
  private _pointerOver = false;

  private _layoutWidth = 0;
  private _layoutHeight = 0;

  public constructor(opts: ButtonComponentPreset = {}) {
    super();

    this._skin = opts.skin ?? DEFAULT_SKIN;
    // Default-skin PNGs ship with a 2px black border; opt them into 9-slice
    // automatically so the border stays crisp at any size. Custom skins
    // default to 0 (plain stretch); the consumer opts in by setting `border`.
    const border = opts.border ?? (opts.skin ? 0 : 2);

    // The sprite size is driven manually from `handleLayout` via
    // `applySpriteSize`. We deliberately do NOT give the sprite a `layout`
    // property: `width: "100%"` would either divide by 0 against an EMPTY
    // texture (Infinity scale → invisible) or resolve against the wrong
    // positioned ancestor (sprite swallows the screen). Plain `position`
    // + manual `width`/`height` is more predictable.
    this._bgSprite =
      border > 0
        ? new PIXI.NineSliceSprite({
            texture: PIXI.Texture.EMPTY,
            leftWidth: border,
            topHeight: border,
            rightWidth: border,
            bottomHeight: border,
          })
        : new PIXI.Sprite(PIXI.Texture.EMPTY);
    this._bgSprite.position.set(0, 0);
    this._bgSprite.visible = false;
    this.addChild(this._bgSprite);

    if (opts.label !== undefined) {
      const mergedStyle = { ...DEFAULT_LABEL_STYLE, ...opts.labelStyle };
      this._label = new PIXI.Text({ text: opts.label, style: mergedStyle });
      this._label.anchor.set(0.5, 0.5);
      this._label.layout = {};
      this.addChild(this._label);
    } else {
      this._label = null;
    }

    if (opts.x !== undefined) this.x = opts.x;
    if (opts.y !== undefined) this.y = opts.y;

    const layout: Omit<LayoutOptions, "target"> = { justifyContent: "center", alignItems: "center" };
    if (opts.width !== undefined) layout.width = opts.width;
    if (opts.height !== undefined) layout.height = opts.height;
    this.layout = layout;

    this.on("layout", (l: Layout) => this.handleLayout(l));

    this._button = new Button(this);
    this._button.onDown.connect(() => this.onPointerDown());
    this._button.onUp.connect(() => this.onPointerUp());
    this._button.onUpOut.connect(() => this.onPointerUpOut());
    this._button.onHover.connect(() => this.onPointerHover());
    this._button.onOut.connect(() => this.onPointerOut());
  }

  /** Replace the active skin and re-resolve via the asset manager. */
  public setSkin(skin: ButtonSkin, assetManager: IAssetManager): void {
    this._skin = skin;
    this.resolveAssets(assetManager);
  }

  /** Update the label text. No-op if the button was created without a label. */
  public setLabel(text: string): void {
    if (this._label) this._label.text = text;
  }

  /**
   * Enable or disable interaction. Disabling swaps to the `disabled`
   * texture and prevents `onPress` from firing; re-enabling resets to
   * `idle` (or `hover` if the pointer is currently over the button).
   */
  public setEnabled(enabled: boolean): void {
    if (this._enabled === enabled) return;
    this._enabled = enabled;
    this._button.enabled = enabled;
    if (!enabled) {
      this._setState("disabled");
    } else {
      this._setState(this._pointerOver ? "hover" : "idle");
    }
  }

  /** Subscribe to press events. Returns an unsubscribe function. */
  public onPress(cb: () => void): Unsubscribe {
    const guarded = (): void => {
      if (this._enabled) cb();
    };
    this._button.onPress.connect(guarded);
    return () => this._button.onPress.disconnect(guarded);
  }

  /** Resolve the active skin's asset ids into textures and apply the current state. */
  public resolveAssets(assetManager: IAssetManager): void {
    const idle = assetManager.getAsset<PIXI.Texture>(this._skin.idle) ?? PIXI.Texture.EMPTY;
    const hover = (this._skin.hover && assetManager.getAsset<PIXI.Texture>(this._skin.hover)) || idle;
    const pressed = (this._skin.pressed && assetManager.getAsset<PIXI.Texture>(this._skin.pressed)) || idle;
    const disabled = (this._skin.disabled && assetManager.getAsset<PIXI.Texture>(this._skin.disabled)) || idle;
    this._textures.idle = idle;
    this._textures.hover = hover;
    this._textures.pressed = pressed;
    this._textures.disabled = disabled;
    this._applyTexture();
  }

  // ── Internal: state machine ────────────────────────────────────────

  private onPointerDown(): void {
    if (!this._enabled) return;
    this._setState("pressed");
  }

  private onPointerUp(): void {
    if (!this._enabled) return;
    this._setState(this._pointerOver ? "hover" : "idle");
  }

  private onPointerUpOut(): void {
    if (!this._enabled) return;
    this._setState("idle");
  }

  private onPointerHover(): void {
    this._pointerOver = true;
    if (!this._enabled) return;
    if (this._state !== "pressed") this._setState("hover");
  }

  private onPointerOut(): void {
    this._pointerOver = false;
    if (!this._enabled) return;
    if (this._state !== "pressed") this._setState("idle");
  }

  private _setState(state: ButtonState): void {
    if (this._state === state) return;
    this._state = state;
    this._applyTexture();
  }

  private _applyTexture(): void {
    const tex = this._textures[this._state];
    this._bgSprite.texture = tex;
    this._bgSprite.visible = tex !== PIXI.Texture.EMPTY;
    if (this._layoutWidth > 0 && this._layoutHeight > 0) {
      this.applySpriteSize(this._layoutWidth, this._layoutHeight);
    }
  }

  // ── Internal: layout ──────────────────────────────────────────────

  private handleLayout(l: Layout): void {
    const w = Math.max(1, Math.floor(l.computedLayout.width));
    const h = Math.max(1, Math.floor(l.computedLayout.height));
    this._layoutWidth = w;
    this._layoutHeight = h;
    this.applySpriteSize(w, h);
  }

  private applySpriteSize(w: number, h: number): void {
    // EMPTY's source has size 0; setting `.width` here would divide by 0 and
    // leave the sprite with `Infinity` scale even after a real texture lands.
    // Skip until `_applyTexture` has installed a non-empty texture.
    if (this._bgSprite.texture === PIXI.Texture.EMPTY) return;
    // `NineSliceSprite.width/height` set rendered geometry directly (corners
    // stay at their texture size, middle stretches). `Sprite.width` instead
    // sets `scale.x = w / texture.width`; reset scale defensively first.
    if (this._bgSprite instanceof PIXI.Sprite) {
      this._bgSprite.scale.set(1, 1);
    }
    this._bgSprite.width = w;
    this._bgSprite.height = h;
  }
}
