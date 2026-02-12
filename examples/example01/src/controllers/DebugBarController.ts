import type { IController } from "gamelabsjs";
import type { IDebugBarView } from "../views/IDebugBarView";
import type { DebugEvents } from "../events/DebugEvents";

export class DebugBarController implements IController {
  private readonly view: IDebugBarView;
  private readonly events: DebugEvents;
  private unsubscribeToggle: (() => void) | null = null;
  private unsubscribeToggleGroundGrid: (() => void) | null = null;
  private visible = false;

  constructor(deps: { view: IDebugBarView; events: DebugEvents }) {
    this.view = deps.view;
    this.events = deps.events;
  }

  initialize(): void {
    this.view.setBarVisible(false);
    this.unsubscribeToggle = this.view.onToggleDebug(() => {
      this.visible = !this.visible;
      this.view.setBarVisible(this.visible);
    });

    this.unsubscribeToggleGroundGrid = this.view.onToggleGroundGrid(() => {
      this.events.emitToggleGroundGrid();
    });
  }

  destroy(): void {
    this.unsubscribeToggle?.();
    this.unsubscribeToggle = null;
    this.unsubscribeToggleGroundGrid?.();
    this.unsubscribeToggleGroundGrid = null;
  }
}

