import { UnsubscribeBag, type IInstanceResolver, type IViewController } from "gamelabsjs";
import type { IGameScreenView } from "../views/IGameScreenView";
import { TicTacToeTurnManagerToken, type TicTacToeTurnManager } from "../services/TicTacToeTurnManager.js";
import { Team } from "../models/GameItem.js";

export class GameScreenController implements IViewController<IGameScreenView> {
  private _view: IGameScreenView | null = null;
  private readonly _subs = new UnsubscribeBag();
  private _turnManager: TicTacToeTurnManager | null = null;

  public inject(resolver: IInstanceResolver): void {
    this._turnManager = resolver.getInstance(TicTacToeTurnManagerToken);
  }

  public initialize(view: IGameScreenView): void {
    this._view = view;
    view.setActiveTeam(this._turnManager?.currentTeam ?? Team.X);
    this._subs.add(this._turnManager?.onTurnChanged((team) => this._view?.setActiveTeam(team)));
  }

  public destroy(): void {
    this._subs.flush();
    this._view = null;
    this._turnManager = null;
  }
}
