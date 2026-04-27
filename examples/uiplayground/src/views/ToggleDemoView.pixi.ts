import * as PIXI from "pixi.js";
import {
  HudViewBase,
  ToggleComponent,
  type IInstanceResolver,
  type Unsubscribe,
} from "@gamebyte/gamelabsjs";
import { UIPlaygroundConfig } from "../UIPlaygroundConfig.js";
import type { IToggleDemoView } from "./IToggleDemoView.js";

/**
 * Live preview for the `ToggleComponent` playground demo. Width /
 * height / on-color changes rebuild the underlying toggle (those are
 * constructor-only on `ToggleComponent`); `toggle()` reuses the live
 * instance so the user sees the actual flip animation.
 *
 * Centring: handled by the parent stage container.
 *
 * Outline: drawn at the toggle's `_width × _height` bounds.
 */
export class ToggleDemoView extends HudViewBase implements IToggleDemoView {
  private _config: UIPlaygroundConfig | null = null;
  private _toggle: ToggleComponent | null = null;
  private _outline: PIXI.Graphics | null = null;
  private _outlineVisible = false;
  private _changeUnsub: Unsubscribe | null = null;
  private readonly _changeListeners = new Set<(value: boolean) => void>();

  private _width = 60;
  private _height = 32;
  private _onColor = 0x48bb78;
  private _value = false;

  public override inject(resolver: IInstanceResolver): void {
    super.inject(resolver);
    this._config = resolver.getInstance(UIPlaygroundConfig);
  }

  public override postInitialize(): void {
    super.postInitialize();
    this.layout = {};
    this._rebuildToggle();
  }

  public setWidth(width: number): void {
    if (this._width === width) return;
    this._width = width;
    this._rebuildToggle();
  }

  public setHeight(height: number): void {
    if (this._height === height) return;
    this._height = height;
    this._rebuildToggle();
  }

  public setOnColor(color: number): void {
    if (this._onColor === color) return;
    this._onColor = color;
    this._rebuildToggle();
  }

  public toggle(): void {
    this._toggle?.toggle();
  }

  public setOutlineVisible(visible: boolean): void {
    this._outlineVisible = visible;
    this._refreshOutline();
  }

  public onChange(cb: (value: boolean) => void): Unsubscribe {
    this._changeListeners.add(cb);
    return () => this._changeListeners.delete(cb);
  }

  public override preDestroy(): void {
    this._changeListeners.clear();
    this._changeUnsub?.();
    this._changeUnsub = null;
    this._outline?.removeFromParent();
    this._outline?.destroy();
    this._outline = null;
    this._toggle?.removeFromParent();
    this._toggle?.destroy();
    this._toggle = null;
    this._config = null;
    super.preDestroy();
  }

  private _fireChange(value: boolean): void {
    this._value = value;
    for (const cb of this._changeListeners) cb(value);
  }

  private _rebuildToggle(): void {
    this._changeUnsub?.();
    this._changeUnsub = null;
    this._outline?.removeFromParent();
    this._outline?.destroy();
    this._outline = null;
    this._toggle?.removeFromParent();
    this._toggle?.destroy();

    this._toggle = new ToggleComponent({
      width: this._width,
      height: this._height,
      onColor: this._onColor,
      value: this._value,
    });
    this._changeUnsub = this._toggle.onChange((value) => this._fireChange(value));
    this.addChild(this._toggle);
    this._refreshOutline();
  }

  private _refreshOutline(): void {
    this._outline?.removeFromParent();
    this._outline?.destroy();
    this._outline = null;
    if (!this._outlineVisible || !this._toggle || !this._config) return;

    const outline = new PIXI.Graphics();
    outline.eventMode = "none";
    outline
      .rect(0, 0, this._width, this._height)
      .stroke({ color: this._config.outlineColor, width: this._config.outlineWidth });
    this._toggle.addChild(outline);
    this._outline = outline;
  }
}
