import { UnsubscribeBag, UIEvents, UpdateService, type IInstanceResolver, type IViewController, type Unsubscribe } from "@gamebyte/gamelabsjs";
import type { IGameScreenView } from "../views/IGameScreenView";
import { AvoidanceUIIds } from "../AvoidanceUIIds.js";
import { GameEvents } from "../events/GameEvents.js";

export class GameScreenController implements IViewController<IGameScreenView> {
  private _view: IGameScreenView | null = null;
  private readonly _subs = new UnsubscribeBag();
  private _uiEvents: UIEvents | null = null;
  private _updateService: UpdateService | null = null;
  private _gameEvents: GameEvents | null = null;
  private _updateUnsub: Unsubscribe | null = null;

  public inject(resolver: IInstanceResolver): void {
    this._uiEvents = resolver.getInstance(UIEvents);
    this._updateService = resolver.getInstance(UpdateService);
    this._gameEvents = resolver.getInstance(GameEvents);
  }

  public initialize(view: IGameScreenView): void {
    this._view = view;

    // Forward keyboard input to game events
    this._subs.add(view.onDirectionInput((dx, dy) => {
      this._gameEvents?.emitDirectionInput(dx, dy);
    }));

    // HUD updates from game events
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

    // Poll input each frame
    this._updateUnsub = this._updateService!.register(() => {
      (this._view as any)?.pollInput?.();
    });
  }

  public destroy(): void {
    this._updateUnsub?.();
    this._updateUnsub = null;
    this._subs.flush();
    this._view = null;
    this._uiEvents = null;
    this._updateService = null;
    this._gameEvents = null;
  }
}
