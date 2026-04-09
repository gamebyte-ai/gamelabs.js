import { UnsubscribeBag, UIEvents, type IInstanceResolver, type IViewController } from "gamelabsjs";
import type { IGameScreenView } from "../views/IGameScreenView";
import { AvoidanceUIIds } from "../AvoidanceUIIds.js";
import { GameEvents } from "../events/GameEvents.js";

export class GameScreenViewController implements IViewController<IGameScreenView> {
  private _view: IGameScreenView | null = null;
  private readonly _subs = new UnsubscribeBag();
  private _uiEvents: UIEvents | null = null;
  private _gameEvents: GameEvents | null = null;

  public inject(resolver: IInstanceResolver): void {
    this._uiEvents = resolver.getInstance(UIEvents);
    this._gameEvents = resolver.getInstance(GameEvents);
  }

  public initialize(view: IGameScreenView): void {
    this._view = view;

    this._subs.add(this._gameEvents!.onWaveStarted((wave) => {
      this._view?.showWaveText(wave);
      this._view?.setWave(wave);
    }));

    this._subs.add(this._gameEvents!.onWaveAnnounceEnded(() => {
      this._view?.hideWaveText();
    }));

    this._subs.add(this._gameEvents!.onGameOver(() => {
      this._view?.hideWaveText();
      this._uiEvents?.createPopup(AvoidanceUIIds.GameOverPopup);
    }));
  }

  public destroy(): void {
    this._subs.flush();
    this._view = null;
    this._uiEvents = null;
    this._gameEvents = null;
  }
}
