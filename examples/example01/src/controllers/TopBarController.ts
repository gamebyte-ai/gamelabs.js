import { UnsubscribeBag, type IInstanceResolver, type IViewController } from "gamelabsjs";
import type { ITopBarView } from "../views/ITopBarView";
import { GameEvents } from "../events/GameEvents";
import { DebugEvents } from "../events/DebugEvents";

export class TopBarController implements IViewController {
  private readonly view: ITopBarView;
  private readonly gameEvents: GameEvents;
  private readonly debugEvents: DebugEvents;

  private readonly subs = new UnsubscribeBag();
  private toggled = false;

  constructor(deps: { view: ITopBarView; resolver: IInstanceResolver }) {
    this.view = deps.view;
    this.gameEvents = deps.resolver.getInstance(GameEvents);
    this.debugEvents = deps.resolver.getInstance(DebugEvents);
  }

  initialize(): void {
    this.subs.add(this.view.onToggleColor(() => {
      this.toggled = !this.toggled;
      this.gameEvents.emitChangeCubeColor(this.toggled ? 0xf97316 : 0x3b82f6);
    }));

    this.subs.add(this.view.onToggleRotation(() => {
      this.gameEvents.emitToggleCubeRotation();
    }));

    this.subs.add(this.view.onToggleDebug(() => {
      this.debugEvents.emitToggleDebugPanel();
    }));
  }

  destroy(): void {
    this.subs.flush();
  }
}

