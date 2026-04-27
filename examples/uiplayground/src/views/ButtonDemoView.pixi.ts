import * as PIXI from "pixi.js";
import {
  ButtonComponent,
  HudViewBase,
  type IInstanceResolver,
  type Unsubscribe,
} from "@gamebyte/gamelabsjs";
import { UIPlaygroundConfig } from "../UIPlaygroundConfig.js";
import type { IButtonDemoView } from "./IButtonDemoView.js";

/**
 * Live preview for the `ButtonComponent` playground demo. Lives inside
 * the shell view's stage region as a HUD child view. Created and
 * destroyed by `PlaygroundShellView.mountDemo` via the framework's
 * `viewFactory`.
 *
 * Centring: handled by the parent stage container (`PlaygroundShellView`'s
 * stage region uses `alignItems: "center"` + `justifyContent: "center"`),
 * so the demo view doesn't need an internal centring wrapper. The live
 * `ButtonComponent` is added as a direct child of this view.
 *
 * Outline: when the global "outline" toggle is ON, a debug rectangle
 * is drawn at the button's bounds so the user can see the component's
 * actual layout box. The outline is a child of the button so it
 * follows position changes for free.
 */
export class ButtonDemoView extends HudViewBase implements IButtonDemoView {
  private _config: UIPlaygroundConfig | null = null;
  private _button: ButtonComponent | null = null;
  private _outline: PIXI.Graphics | null = null;
  private _outlineVisible = false;
  private _pressUnsub: Unsubscribe | null = null;
  private readonly _pressListeners = new Set<() => void>();

  // Mutable props driving the live `ButtonComponent` instance.
  private _label = "Click me";
  private _width = 160;
  private _height = 44;
  private _radius = 12;
  private _fillColor = 0x3b82f6;

  public override inject(resolver: IInstanceResolver): void {
    super.inject(resolver);
    this._config = resolver.getInstance(UIPlaygroundConfig);
  }

  public override postInitialize(): void {
    super.postInitialize();
    this.layout = {};
    this._rebuildButton();
  }

  public setWidth(width: number): void {
    if (this._width === width) return;
    this._width = width;
    this._rebuildButton();
  }

  public setHeight(height: number): void {
    if (this._height === height) return;
    this._height = height;
    this._rebuildButton();
  }

  public setRadius(radius: number): void {
    if (this._radius === radius) return;
    this._radius = radius;
    this._rebuildButton();
  }

  public setFillColor(color: number): void {
    if (this._fillColor === color) return;
    this._fillColor = color;
    this._rebuildButton();
  }

  public setLabel(label: string): void {
    if (this._label === label) return;
    this._label = label;
    this._button?.setLabel(label);
  }

  public setOutlineVisible(visible: boolean): void {
    this._outlineVisible = visible;
    this._refreshOutline();
  }

  public onPress(cb: () => void): Unsubscribe {
    this._pressListeners.add(cb);
    return () => this._pressListeners.delete(cb);
  }

  public override preDestroy(): void {
    this._pressListeners.clear();
    this._pressUnsub?.();
    this._pressUnsub = null;
    this._outline?.removeFromParent();
    this._outline?.destroy();
    this._outline = null;
    this._button?.removeFromParent();
    this._button?.destroy();
    this._button = null;
    this._config = null;
    super.preDestroy();
  }

  private _firePress(): void {
    for (const cb of this._pressListeners) cb();
  }

  private _rebuildButton(): void {
    this._pressUnsub?.();
    this._pressUnsub = null;
    this._outline?.removeFromParent();
    this._outline?.destroy();
    this._outline = null;
    this._button?.removeFromParent();
    this._button?.destroy();

    this._button = new ButtonComponent({
      width: this._width,
      height: this._height,
      radius: this._radius,
      fillColor: this._fillColor,
      label: this._label,
      labelStyle: { fontSize: 16, fontWeight: "700", fill: 0xffffff },
    });
    this._pressUnsub = this._button.onPress(() => this._firePress());
    this.addChild(this._button);
    this._refreshOutline();
  }

  private _refreshOutline(): void {
    this._outline?.removeFromParent();
    this._outline?.destroy();
    this._outline = null;
    if (!this._outlineVisible || !this._button || !this._config) return;

    const outline = new PIXI.Graphics();
    outline.eventMode = "none";
    outline
      .rect(0, 0, this._width, this._height)
      .stroke({ color: this._config.outlineColor, width: this._config.outlineWidth });
    this._button.addChild(outline);
    this._outline = outline;
  }
}
