import { NO_SCREEN_TRANSITION, type IViewController, type ScreenTransition } from "gamelabsjs";
import type { GameEvents } from "../events/GameEvents";
import type { DebugEvents } from "../events/DebugEvents";
import { DebugBarController } from "./DebugBarController";
import { TopBarController } from "./TopBarController";
import { DebugBarView } from "../views/DebugBarView.pixi";
import { GameScreenView } from "../views/GameScreenView.pixi";
import { TopBarView } from "../views/TopBarView.pixi";

const INSTANT_TRANSITION: ScreenTransition = { type: "instant", durationMs: 0 };

export class GameScreenViewController implements IViewController {
  private readonly view: GameScreenView;
  private readonly enterTransition: ScreenTransition;
  private readonly events: GameEvents;
  private readonly debugEvents: DebugEvents;

  private topBar: TopBarView | null = null;
  private debugBar: DebugBarView | null = null;
  private topBarController: TopBarController | null = null;
  private debugBarController: DebugBarController | null = null;
  private unsubscribeToggleDebug: (() => void) | null = null;
  private debugBarVisible = false;

  constructor(deps: {
    view: GameScreenView;
    events: GameEvents;
    debugEvents: DebugEvents;
    transition?: ScreenTransition;
  }) {
    this.view = deps.view;
    this.events = deps.events;
    this.debugEvents = deps.debugEvents;
    this.enterTransition = deps.transition ?? INSTANT_TRANSITION;
  }

  initialize(): void {
    this.topBar = new TopBarView();
    this.view.attachTopBar(this.topBar);
    this.topBarController = new TopBarController({ view: this.topBar, events: this.events });
    this.topBarController.initialize();

    this.debugBar = new DebugBarView();
    this.view.attachDebugBar(this.debugBar);
    this.debugBarController = new DebugBarController({ view: this.debugBar, events: this.debugEvents });
    this.debugBarController.initialize();

    // Debug toggle lives in TopBar; it controls DebugBar visibility.
    this.debugBarVisible = false;
    this.debugBar.setBarVisible(false);
    this.unsubscribeToggleDebug = this.topBar.onToggleDebug(() => {
      this.debugBarVisible = !this.debugBarVisible;
      this.debugBar?.setBarVisible(this.debugBarVisible);
    });

    void this.view.onEnter?.(this.enterTransition);
  }

  destroy(): void {
    void this.view.onExit?.(NO_SCREEN_TRANSITION);

    this.unsubscribeToggleDebug?.();
    this.unsubscribeToggleDebug = null;

    this.topBarController?.destroy();
    this.topBarController = null;
    this.debugBarController?.destroy();
    this.debugBarController = null;

    this.topBar?.destroy();
    this.topBar = null;
    this.debugBar?.destroy();
    this.debugBar = null;
  }
}

