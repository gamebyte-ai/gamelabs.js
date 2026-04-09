import { UnsubscribeBag, UIEvents, type IInstanceResolver, type IViewController } from "gamelabsjs";
import type { IGameScreenView } from "../views/IGameScreenView";
import { TicTacToeTurnManagerToken, type TicTacToeTurnManager } from "../utilities/TicTacToeTurnManager.js";
import { TurnEvents } from "../events/TurnEvents.js";
import { TicTacToeUIIds } from "../TicTacToeUIIds.js";
import { Team } from "../models/GameItem.js";

export class GameScreenViewController implements IViewController<IGameScreenView> {
  private _view: IGameScreenView | null = null;
  private readonly _subs = new UnsubscribeBag();
  private _turnManager: TicTacToeTurnManager | null = null;
  private _turnEvents: TurnEvents | null = null;
  private _uiEvents: UIEvents | null = null;

  public inject(resolver: IInstanceResolver): void {
    this._turnManager = resolver.getInstance(TicTacToeTurnManagerToken);
    this._turnEvents = resolver.getInstance(TurnEvents);
    this._uiEvents = resolver.getInstance(UIEvents);
  }

  public initialize(view: IGameScreenView): void {
    this._view = view;
    view.setActiveTeam(this._turnManager?.currentTeam ?? Team.X);

    this._subs.add(this._turnEvents?.onTurnChanged((team) => this._view?.setActiveTeam(team)));

    this._subs.add(this._turnEvents?.onGameWon(() => {
      this._uiEvents?.createPopup(TicTacToeUIIds.WinPopup);
    }));

    this._subs.add(this._turnEvents?.onGameDraw(() => {
      this._uiEvents?.createPopup(TicTacToeUIIds.WinPopup);
    }));
  }

  public destroy(): void {
    this._subs.flush();
    this._view = null;
    this._turnManager = null;
    this._turnEvents = null;
    this._uiEvents = null;
  }
}
