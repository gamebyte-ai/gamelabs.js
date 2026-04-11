import { UnsubscribeBag } from "../../../../core/events/subscriptions.js";
import type { IInstanceResolver } from "../../../../core/di/IInstanceResolver.js";
import type { IViewController } from "../../../../core/views/IViewController.js";
import type { IOnScreenControlsView } from "../views/IOnScreenControlsView.js";
import { OnScreenControlManager } from "../utilities/OnScreenControlManager.js";

export class OnScreenControlsViewController implements IViewController<IOnScreenControlsView> {
  private _view: IOnScreenControlsView | null = null;
  private _manager: OnScreenControlManager | null = null;
  private readonly _subs = new UnsubscribeBag();

  public inject(resolver: IInstanceResolver): void {
    this._manager = resolver.getInstance(OnScreenControlManager);
  }

  public initialize(view: IOnScreenControlsView): void {
    this._view = view;

    // Create controls already registered before the view existed
    for (const config of this._manager!.getControls()) {
      view.createControl(config);
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
