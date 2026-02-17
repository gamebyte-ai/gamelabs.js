import { UnsubscribeBag, type IInstanceResolver, type IViewController } from "gamelabsjs";
import type { IDebugBarView } from "../views/IDebugBarView";
import { DebugEvents } from "../events/DebugEvents";

export class DebugBarController implements IViewController<IDebugBarView> {
  private view: IDebugBarView | null = null;
  private events: DebugEvents | null = null;
  private readonly subs = new UnsubscribeBag();
  private visible = false;

  initialize(view: IDebugBarView, resolver: IInstanceResolver): void {
    this.view = view;
    this.events = resolver.getInstance(DebugEvents);

    this.visible = false;
    this.view.setBarVisible(false);

    this.subs.add(this.view.onToggleGroundGrid(() => {
      this.events?.emitToggleGroundGrid();
    }));

    this.subs.add(this.view.onToggleStats(() => {
      this.events?.emitToggleStats();
    }));

    if (this.events) {
      this.subs.add(this.events.onToggleDebugPanel(() => {
        this.visible = !this.visible;
        this.view?.setBarVisible(this.visible);
      }));
    }
  }

  destroy(): void {
    this.subs.flush();
    this.view = null;
    this.events = null;
  }
}

