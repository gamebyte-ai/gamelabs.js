import { UnsubscribeBag, type IViewController } from "gamelabsjs";
import type { IDebugBarView } from "../views/IDebugBarView";
import type { DebugEvents } from "../events/DebugEvents";

export class DebugBarController implements IViewController {
  private readonly view: IDebugBarView;
  private readonly events: DebugEvents;
  private readonly subs = new UnsubscribeBag();
  private visible = false;

  constructor(deps: { view: IDebugBarView; events: DebugEvents }) {
    this.view = deps.view;
    this.events = deps.events;
  }

  initialize(): void {
    this.visible = false;
    this.view.setBarVisible(false);

    this.subs.add(this.view.onToggleGroundGrid(() => {
      this.events.emitToggleGroundGrid();
    }));

    this.subs.add(this.events.onToggleDebugPanel(() => {
      this.visible = !this.visible;
      this.view.setBarVisible(this.visible);
    }));
  }

  destroy(): void {
    this.subs.flush();
  }
}

