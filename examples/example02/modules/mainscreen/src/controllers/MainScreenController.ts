import { UnsubscribeBag, type IInstanceResolver, type IViewController } from "gamelabsjs";
import type { IMainScreenView } from "../views/IMainScreen.js";
import { MainScreenEvents } from "../events/MainScreenEvents.js";

/**
 * Main screen controller.
 */
export class MainScreenController implements IViewController<IMainScreenView> {
  private view: IMainScreenView | null = null;
  private readonly subs = new UnsubscribeBag();
  private events: MainScreenEvents | null = null;

  initialize(view: IMainScreenView, resolver: IInstanceResolver): void {
    this.view = view;
    this.events = resolver.getInstance(MainScreenEvents);

    this.subs.add(this.view.onPlayClick(() => this.events?.emitPlayClick()));
    this.subs.add(this.view.onSettingsClick(() => this.events?.emitSettingsClick()));
  }

  destroy(): void {
    this.subs.flush();
    this.view = null;
    this.events = null;
  }
}

