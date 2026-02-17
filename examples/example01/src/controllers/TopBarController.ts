import { UnsubscribeBag, type IInstanceResolver, type IViewController } from "gamelabsjs";
import type { ITopBarView } from "../views/ITopBarView";
import { GameEvents } from "../events/GameEvents";
import { DebugEvents } from "../events/DebugEvents";

export class TopBarController implements IViewController<ITopBarView> {
  private view: ITopBarView | null = null;
  private gameEvents: GameEvents | null = null;
  private debugEvents: DebugEvents | null = null;

  private readonly subs = new UnsubscribeBag();
  private toggled = false;

  initialize(view: ITopBarView, resolver: IInstanceResolver): void {
    this.view = view;
    this.gameEvents = resolver.getInstance(GameEvents);
    this.debugEvents = resolver.getInstance(DebugEvents);

    this.subs.add(this.view.onToggleColor(() => {
      this.toggled = !this.toggled;
      this.gameEvents?.emitChangeCubeColor(this.toggled ? 0xf97316 : 0x3b82f6);
    }));

    this.subs.add(this.view.onToggleRotation(() => {
      this.gameEvents?.emitToggleCubeRotation();
    }));

    this.subs.add(this.view.onToggleDebug(() => {
      this.debugEvents?.emitToggleDebugPanel();
    }));
  }

  destroy(): void {
    this.subs.flush();
    this.view = null;
    this.gameEvents = null;
    this.debugEvents = null;
  }
}

