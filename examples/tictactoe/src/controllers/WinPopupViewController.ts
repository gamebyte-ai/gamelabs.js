import { UnsubscribeBag, UIEvents, type IInstanceResolver, type IViewController } from "@gamebyte/gamelabsjs";
import type { IWinPopupView } from "../views/IWinPopupView";
import { TicTacToeTurnManagerToken, type TicTacToeTurnManager } from "../utilities/TicTacToeTurnManager.js";
import { TurnEvents } from "../events/TurnEvents.js";

export class WinPopupViewController implements IViewController<IWinPopupView> {
  private _view: IWinPopupView | null = null;
  private readonly _subs = new UnsubscribeBag();
  private _turnManager: TicTacToeTurnManager | null = null;
  private _turnEvents: TurnEvents | null = null;
  private _uiEvents: UIEvents | null = null;

  public inject(resolver: IInstanceResolver): void {
    this._turnManager = resolver.getInstance(TicTacToeTurnManagerToken);
    this._turnEvents = resolver.getInstance(TurnEvents);
    this._uiEvents = resolver.getInstance(UIEvents);
  }

  public initialize(view: IWinPopupView): void {
    this._view = view;

    // Set the result from current game state
    this._view.setResult(this._turnManager?.winner ?? null);

    this._subs.add(this._view.onPlayAgain(() => {
      this._turnManager?.restart();
      this._uiEvents?.removeTopPopup();
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
