import type { IViewController } from "gamelabsjs";
import type { IDebugBarView } from "../views/IDebugBarView";
import type { DebugEvents } from "../events/DebugEvents";

export class DebugBarController implements IViewController {
  private readonly view: IDebugBarView;
  private readonly events: DebugEvents;
  private unsubscribeToggleGroundGrid: (() => void) | null = null;

  constructor(deps: { view: IDebugBarView; events: DebugEvents }) {
    this.view = deps.view;
    this.events = deps.events;
  }

  initialize(): void {
    this.view.setBarVisible(false);

    this.unsubscribeToggleGroundGrid = this.view.onToggleGroundGrid(() => {
      this.events.emitToggleGroundGrid();
    });
  }

  destroy(): void {
    this.unsubscribeToggleGroundGrid?.();
    this.unsubscribeToggleGroundGrid = null;
  }
}

