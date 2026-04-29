import { UnsubscribeBag } from "../../../../core/events/subscriptions.js";
import type { IInstanceResolver } from "../../../../core/di/IInstanceResolver.js";
import type { IViewController } from "../../../../core/views/IViewController.js";
import type { IOnScreenControlsView } from "../views/IOnScreenControlsView.js";
import { OnScreenControlManager } from "../utilities/OnScreenControlManager.js";
import { ControlType } from "../OnScreenControlTypes.js";

/**
 * Wires the `OnScreenControlsView` against the `OnScreenControlManager`.
 *
 * - Replays existing controls and their latched state (enabled,
 *   visibility, button progress, label text) when the view binds late
 *   so anything registered before the screen was created renders
 *   correctly on first display.
 * - Forwards manager events (`controlAdded` / `controlRemoved` /
 *   `controlEnabledChanged` / `controlVisibilityChanged` / progress
 *   visibility + value / label text changes) to the view.
 * - Bridges view pointer events back to the manager via
 *   `setButtonDown` / `setButtonUp` / `setJoystickDirection` /
 *   `resetJoystick`.
 *
 * Registered automatically by `OnScreenControlsBinding`; apps don't
 * instantiate it directly.
 */
export class OnScreenControlsViewController implements IViewController<IOnScreenControlsView> {
  private _view: IOnScreenControlsView | null = null;
  private _manager: OnScreenControlManager | null = null;
  private readonly _subs = new UnsubscribeBag();

  public inject(resolver: IInstanceResolver): void {
    this._manager = resolver.getInstance(OnScreenControlManager);
  }

  public initialize(view: IOnScreenControlsView): void {
    this._view = view;

    // Create controls already registered before the view existed and
    // replay enabled / visibility / progress / label-text flags so a
    // control mutated while the view was off-screen renders correctly
    // on first display.
    for (const config of this._manager!.getControls()) {
      view.createControl(config);
      if (!this._manager!.isControlEnabled(config.id)) view.setControlEnabled(config.id, false);
      if (!this._manager!.isControlVisible(config.id)) view.setControlVisible(config.id, false);
      if (config.type === ControlType.Button) {
        const progress = this._manager!.getButtonProgress(config.id);
        if (progress > 0) view.setButtonProgressValue(config.id, progress);
        if (this._manager!.isButtonProgressVisible(config.id)) view.setButtonProgressVisible(config.id, true);
      } else if (config.type === ControlType.Label) {
        const current = this._manager!.getLabelText(config.id);
        if (current !== config.content) view.setLabelText(config.id, current);
      }
    }

    // Listen for dynamic control changes
    this._subs.add(
      this._manager!.events.onControlAdded((config) => {
        this._view?.createControl(config);
      }),
    );

    this._subs.add(
      this._manager!.events.onControlRemoved((id) => {
        this._view?.removeControl(id);
      }),
    );

    this._subs.add(
      this._manager!.events.onControlEnabledChanged((id, enabled) => {
        this._view?.setControlEnabled(id, enabled);
      }),
    );

    this._subs.add(
      this._manager!.events.onControlVisibilityChanged((id, visible) => {
        this._view?.setControlVisible(id, visible);
      }),
    );

    this._subs.add(
      this._manager!.events.onButtonProgressVisibilityChanged((id, visible) => {
        this._view?.setButtonProgressVisible(id, visible);
      }),
    );

    this._subs.add(
      this._manager!.events.onButtonProgressChanged((id, t) => {
        this._view?.setButtonProgressValue(id, t);
      }),
    );

    this._subs.add(
      this._manager!.events.onLabelTextChanged((id, value) => {
        this._view?.setLabelText(id, value);
      }),
    );

    // Bridge view events to manager
    this._subs.add(
      view.onButtonStateChanged((id, isDown) => {
        if (isDown) this._manager?.setButtonDown(id);
        else this._manager?.setButtonUp(id);
      }),
    );

    this._subs.add(
      view.onJoystickDirectionChanged((id, nx, ny) => {
        if (nx === 0 && ny === 0) this._manager?.resetJoystick(id);
        else this._manager?.setJoystickDirection(id, nx, ny);
      }),
    );
  }

  public destroy(): void {
    this._subs.flush();
    this._view = null;
    this._manager = null;
  }
}
