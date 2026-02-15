import { NO_SCREEN_TRANSITION, UnsubscribeBag, type IInstanceResolver, type IViewController, type ScreenTransition } from "gamelabsjs";
import { GameScreenView } from "../views/GameScreenView.pixi";

const INSTANT_TRANSITION: ScreenTransition = { type: "instant", durationMs: 0 };

export class GameScreenViewController implements IViewController {
  private readonly view: GameScreenView;
  private readonly enterTransition: ScreenTransition;
  private readonly subs = new UnsubscribeBag();

  constructor(deps: { view: GameScreenView; resolver: IInstanceResolver }) {
    this.view = deps.view;
    this.enterTransition = INSTANT_TRANSITION;
  }

  initialize(): void {
    void this.view.onEnter?.(this.enterTransition);
  }

  destroy(): void {
    this.subs.flush();
    void this.view.onExit?.(NO_SCREEN_TRANSITION);
  }
}

