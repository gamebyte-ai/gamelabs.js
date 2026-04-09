import { UnsubscribeBag, UIEvents, type IInstanceResolver, type IViewController } from "gamelabsjs";
import type { IWinPopupView } from "../views/IWinPopupView";
import { WaterSortOperations } from "../utilities/WaterSortOperations.js";
import { GameEvents } from "../events/GameEvents.js";

export class WinPopupViewController implements IViewController<IWinPopupView> {
  private _view: IWinPopupView | null = null;
  private readonly _subs = new UnsubscribeBag();
  private _uiEvents: UIEvents | null = null;
  private _gameEvents: GameEvents | null = null;
  private _ops: WaterSortOperations | null = null;

  public inject(resolver: IInstanceResolver): void {
    this._uiEvents = resolver.getInstance(UIEvents);
    this._gameEvents = resolver.getInstance(GameEvents);
    this._ops = resolver.getInstance(WaterSortOperations);
  }

  public initialize(view: IWinPopupView): void {
    this._view = view;
    this._view.setResult(this._ops!.level, this._ops!.moves);

    this._subs.add(this._view.onNextLevel(() => {
      this._uiEvents?.removeTopPopup();
      this._gameEvents?.emitNextLevel();
    }));
  }

  public destroy(): void {
    this._subs.flush();
    this._view = null;
    this._uiEvents = null;
    this._gameEvents = null;
    this._ops = null;
  }
}
