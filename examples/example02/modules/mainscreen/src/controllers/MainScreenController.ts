import { NO_SCREEN_TRANSITION, UnsubscribeBag, type IInstanceResolver, type IViewController, type ScreenTransition } from "gamelabsjs";
import { MainScreen } from "../views/MainScreen.pixi.js";
import { MainScreenEvents } from "../events/MainScreenEvents.js";

const INSTANT_TRANSITION: ScreenTransition = { type: "instant", durationMs: 0 };

/**
 * Minimal controller to drive `onEnter` / `onExit` hooks.
 */
export class MainScreenController implements IViewController {
  private readonly view: MainScreen;
  private readonly enterTransition: ScreenTransition;
  private readonly subs = new UnsubscribeBag();
  private readonly events: MainScreenEvents;

  constructor(deps: { view: MainScreen; resolver: IInstanceResolver }) {
    this.view = deps.view;
    this.events = deps.resolver.getInstance(MainScreenEvents);
    this.enterTransition = INSTANT_TRANSITION;
  }

  initialize(): void {
    void this.view.onEnter?.(this.enterTransition);
    this.subs.add(this.view.onPlayClick(() => this.events.emitPlayClick()));
  }

  destroy(): void {
    this.subs.flush();
    void this.view.onExit?.(NO_SCREEN_TRANSITION);
  }
}

