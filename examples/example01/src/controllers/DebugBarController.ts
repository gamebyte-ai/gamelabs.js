import { IDevUtils, UnsubscribeBag, type IInstanceResolver, type IViewController } from "gamelabsjs";
import type { IDebugBarView } from "../views/IDebugBarView";
import { DebugEvents } from "../events/DebugEvents";

export class DebugBarController implements IViewController<IDebugBarView> {
  private _view: IDebugBarView | null = null;
  private _events: DebugEvents | null = null;
  private _devUtils: IDevUtils | null = null;
  private readonly _subs = new UnsubscribeBag();
  private _visible = false;

  public initialize(view: IDebugBarView, resolver: IInstanceResolver): void {
    this._view = view;
    this._events = resolver.getInstance(DebugEvents);
    this._devUtils = resolver.getInstance(IDevUtils);

    this._visible = false;
    this._view.setBarVisible(false);

    this._subs.add(this._view.onToggleGroundGrid(() => {
      if (!this._devUtils) return;
      this._devUtils.groundGrid.setOptions({ size: 20, divisions: 20, color1: 0x223047, color2: 0x152033, y: -0.75 });
      this._devUtils.groundGrid.show(!this._devUtils.groundGrid.isVisible);
    }));

    this._subs.add(this._view.onToggleStats(() => {
      if (!this._devUtils) return;
      this._devUtils.statsPanel.show(!this._devUtils.statsPanel.isVisible);
    }));

    this._subs.add(this._view.onToggleLog(() => {
      if (!this._devUtils) return;
      this._devUtils.logger.show(!this._devUtils.logger.isVisible);
    }));

    if (this._events) {
      this._subs.add(this._events.onToggleDebugPanel(() => {
        this._visible = !this._visible;
        this._view?.setBarVisible(this._visible);
      }));
    }
  }

  public destroy(): void {
    this._subs.flush();
    this._view = null;
    this._events = null;
    this._devUtils = null;
  }
}

