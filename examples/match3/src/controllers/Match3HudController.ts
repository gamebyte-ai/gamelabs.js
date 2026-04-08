import { UnsubscribeBag, type IInstanceResolver, type IViewController } from "@gamebyte/gamelabsjs";
import { Match3Events } from "../events/Match3Events.js";
import type { IGameScreenView } from "../views/IGameScreenView.js";

/**
 * HUD-only controller: score display. Gameplay lives in {@link Match3GridsViewController}.
 */
export class Match3HudController implements IViewController<IGameScreenView> {
  private _view: IGameScreenView | null = null;
  private _events: Match3Events | null = null;
  private readonly _subs = new UnsubscribeBag();

  public inject(resolver: IInstanceResolver): void {
    this._events = resolver.getInstance(Match3Events);
  }

  public initialize(view: IGameScreenView): void {
    this._view = view;
    view.setScore(0);
    this._subs.add(this._events?.onScoreChanged((score) => this._view?.setScore(score)));
  }

  public destroy(): void {
    this._subs.flush();
    this._view = null;
    this._events = null;
  }
}
