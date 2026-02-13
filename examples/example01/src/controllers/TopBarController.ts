import { UnsubscribeBag, type IViewController } from "gamelabsjs";
import type { ITopBarView } from "../views/ITopBarView";
import type { GameEvents } from "../events/GameEvents";
import type { DebugEvents } from "../events/DebugEvents";

export class TopBarController implements IViewController {
  private readonly view: ITopBarView;
  private readonly events: GameEvents;
  private readonly debugEvents: DebugEvents;

  private readonly subs = new UnsubscribeBag();
  private toggled = false;

  constructor(deps: { view: ITopBarView; events: GameEvents; debugEvents: DebugEvents }) {
    this.view = deps.view;
    this.events = deps.events;
    this.debugEvents = deps.debugEvents;
  }

  initialize(): void {
    this.subs.add(this.view.onToggleColor(() => {
      this.toggled = !this.toggled;
      this.events.emitChangeCubeColor(this.toggled ? 0xf97316 : 0x3b82f6);
    }));

    this.subs.add(this.view.onToggleRotation(() => {
      this.events.emitToggleCubeRotation();
    }));

    this.subs.add(this.view.onToggleDebug(() => {
      this.debugEvents.emitToggleDebugPanel();
    }));
  }

  destroy(): void {
    this.subs.flush();
  }
}

