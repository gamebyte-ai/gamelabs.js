import type { IInstanceResolver, IViewController } from "gamelabsjs";
import { Match3HudSignals } from "../services/Match3HudSignals.js";
import type { GameScreenView } from "../views/GameScreenView.pixi.js";

/**
 * HUD-only controller: score display. Gameplay lives in {@link Match3GridsViewController}.
 */
export class Match3HudController implements IViewController<GameScreenView> {
  private _view: GameScreenView | null = null;
  private _hudSignals: Match3HudSignals | null = null;

  public inject(resolver: IInstanceResolver): void {
    this._hudSignals = resolver.getInstance(Match3HudSignals);
  }

  public initialize(view: GameScreenView): void {
    this._view = view;
    this._hudSignals!.setScoreListener((score) => view.setScore(score));
    view.setScore(0);
  }

  public destroy(): void {
    this._hudSignals?.setScoreListener(null);
    this._view = null;
    this._hudSignals = null;
  }
}
