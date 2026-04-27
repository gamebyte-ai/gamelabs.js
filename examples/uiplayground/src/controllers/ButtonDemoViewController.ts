import {
  UnsubscribeBag,
  type IInstanceResolver,
  type IViewController,
} from "@gamebyte/gamelabsjs";
import {
  BUTTON_FILL_LABELS,
  BUTTON_FILL_PALETTE,
  BUTTON_TEXT_PRESETS,
} from "../constants/DemoPresets.js";
import { IControlsManager } from "../utilities/IControlsManager.js";
import type { IButtonDemoView } from "../views/IButtonDemoView.js";

/**
 * Controller for `ButtonDemoView`. Populates the shared controls panel
 * with width / height / radius / fill-color / label tweaks and pipes
 * the live button's `onPress` events into the event log.
 */
export class ButtonDemoViewController implements IViewController<IButtonDemoView> {
  private _controls: IControlsManager | null = null;
  private _view: IButtonDemoView | null = null;
  private _fillIndex = 0;
  private _labelIndex = 0;
  private readonly _subs = new UnsubscribeBag();

  public inject(resolver: IInstanceResolver): void {
    this._controls = resolver.getInstance(IControlsManager);
  }

  public initialize(view: IButtonDemoView): void {
    if (!this._controls) {
      throw new Error("ButtonDemoViewController is not initialized");
    }
    this._view = view;
    this._controls.clear();

    // Sync the persistent outline toggle's current state into the
    // freshly mounted view, then subscribe so future toggles propagate.
    view.setOutlineVisible(this._controls.isOutlineVisible());
    this._subs.add(this._controls.onOutlineChanged((visible) => view.setOutlineVisible(visible)));

    this._subs.add(
      this._controls.addSliderControl(
        "width",
        { min: 80, max: 280, step: 10, value: 160, format: (v) => `${Math.round(v)}px` },
        (v) => this._onWidthChanged(v),
      ),
    );

    this._subs.add(
      this._controls.addSliderControl(
        "height",
        { min: 28, max: 64, step: 2, value: 44, format: (v) => `${Math.round(v)}px` },
        (v) => this._onHeightChanged(v),
      ),
    );

    this._subs.add(
      this._controls.addSliderControl(
        "radius",
        { min: 0, max: 30, step: 1, value: 12, format: (v) => `${Math.round(v)}px` },
        (v) => this._onRadiusChanged(v),
      ),
    );

    this._subs.add(
      this._controls.addCycleControl(
        "fillColor",
        BUTTON_FILL_PALETTE,
        this._fillIndex,
        (color) => this._formatFillColor(color),
        (_color, index) => this._onFillCycled(index),
      ),
    );

    this._subs.add(
      this._controls.addCycleControl(
        "label",
        BUTTON_TEXT_PRESETS,
        this._labelIndex,
        (text) => text,
        (text) => this._onLabelCycled(text),
      ),
    );

    this._subs.add(
      this._controls.addActionControl("Trigger onPress (programmatic)", () =>
        this._onProgrammaticPress(),
      ),
    );

    this._subs.add(view.onPress(() => this._onLivePress()));
  }

  public destroy(): void {
    this._subs.flush();
    this._view = null;
    this._controls = null;
  }

  // ── Control handlers ────────────────────────────────────────────────

  private _onWidthChanged(v: number): void {
    this._view?.setWidth(Math.round(v));
  }

  private _onHeightChanged(v: number): void {
    this._view?.setHeight(Math.round(v));
  }

  private _onRadiusChanged(v: number): void {
    this._view?.setRadius(Math.round(v));
  }

  private _onFillCycled(index: number): void {
    this._fillIndex = index;
    this._view?.setFillColor(BUTTON_FILL_PALETTE[index]!);
  }

  private _onLabelCycled(text: string): void {
    this._labelIndex = BUTTON_TEXT_PRESETS.indexOf(text);
    this._view?.setLabel(text);
  }

  private _onProgrammaticPress(): void {
    this._controls?.appendLog("Button → onPress (programmatic)");
  }

  private _onLivePress(): void {
    this._controls?.appendLog("Button → onPress");
  }

  private _formatFillColor(color: number): string {
    const idx = BUTTON_FILL_PALETTE.indexOf(color);
    return BUTTON_FILL_LABELS[idx] ?? `#${color.toString(16)}`;
  }
}
