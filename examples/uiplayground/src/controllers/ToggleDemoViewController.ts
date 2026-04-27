import {
  UnsubscribeBag,
  type IInstanceResolver,
  type IViewController,
} from "@gamebyte/gamelabsjs";
import { TOGGLE_ON_LABELS, TOGGLE_ON_PALETTE } from "../constants/DemoPresets.js";
import { IControlsManager } from "../utilities/IControlsManager.js";
import type { IToggleDemoView } from "../views/IToggleDemoView.js";

/**
 * Controller for `ToggleDemoView`. Width / height / on-color tweaks
 * plus a "flip programmatically" action that calls `view.toggle()` so
 * the user sees the actual toggle animation.
 */
export class ToggleDemoViewController implements IViewController<IToggleDemoView> {
  private _controls: IControlsManager | null = null;
  private _view: IToggleDemoView | null = null;
  private _onColorIndex = 0;
  private readonly _subs = new UnsubscribeBag();

  public inject(resolver: IInstanceResolver): void {
    this._controls = resolver.getInstance(IControlsManager);
  }

  public initialize(view: IToggleDemoView): void {
    if (!this._controls) {
      throw new Error("ToggleDemoViewController is not initialized");
    }
    this._view = view;
    this._controls.clear();

    this._subs.add(
      this._controls.addSliderControl(
        "width",
        { min: 36, max: 120, step: 4, value: 60, format: (v) => `${Math.round(v)}px` },
        (v) => this._onWidthChanged(v),
      ),
    );

    this._subs.add(
      this._controls.addSliderControl(
        "height",
        { min: 20, max: 56, step: 2, value: 32, format: (v) => `${Math.round(v)}px` },
        (v) => this._onHeightChanged(v),
      ),
    );

    this._subs.add(
      this._controls.addCycleControl(
        "onColor",
        TOGGLE_ON_PALETTE,
        this._onColorIndex,
        (color) => this._formatOnColor(color),
        (_color, index) => this._onColorCycled(index),
      ),
    );

    this._subs.add(
      this._controls.addActionControl("Flip programmatically", () => this._onProgrammaticFlip()),
    );

    this._subs.add(view.onChange((v) => this._onLiveChange(v)));
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

  private _onColorCycled(index: number): void {
    this._onColorIndex = index;
    this._view?.setOnColor(TOGGLE_ON_PALETTE[index]!);
  }

  private _onProgrammaticFlip(): void {
    this._view?.toggle();
  }

  private _onLiveChange(value: boolean): void {
    this._controls?.appendLog(`Toggle → onChange ${value ? "ON" : "OFF"}`);
  }

  private _formatOnColor(color: number): string {
    const idx = TOGGLE_ON_PALETTE.indexOf(color);
    return TOGGLE_ON_LABELS[idx] ?? `#${color.toString(16)}`;
  }
}
