import { UnsubscribeBag, type IInstanceResolver, type IViewController } from "@gamebyte/gamelabsjs";
import { GameEvents } from "../events/GameEvents.js";
import { IGameState } from "../models/IGameState.js";
import type { IGameSceneView } from "../views/IGameSceneView.js";

/**
 * Drives the {@link IGameSceneView} HP-bar visual from game events and
 * the readonly {@link IGameState}. Holds no domain logic — listens to
 * `levelGenerated` / `enemyReachedBase` and pushes the new ratio into
 * the view.
 */
export class GameSceneViewController implements IViewController<IGameSceneView> {
  private _view: IGameSceneView | null = null;
  private _events: GameEvents | null = null;
  private _state: IGameState | null = null;
  private readonly _subs = new UnsubscribeBag();

  public inject(resolver: IInstanceResolver): void {
    this._events = resolver.getInstance(GameEvents);
    this._state = resolver.getInstance(IGameState);
  }

  public initialize(view: IGameSceneView): void {
    this._view = view;
    view.showBaseHpBar();

    this._subs.add(this._events!.onTeardownLevel(() => this._view?.hideBaseHpBar()));
    this._subs.add(this._events!.onLevelGenerated(() => this._view?.showBaseHpBar()));
    this._subs.add(this._events!.onEnemyReachedBase(() => this._onEnemyReachedBase()));
    this._subs.add(this._events!.onEnemyKilled((reward, x, z) => this._view?.showGoldPopup(x, z, reward)));
  }

  private _onEnemyReachedBase(): void {
    if (!this._view || !this._state) return;
    this._view.setBaseHpRatio(this._state.baseHp / this._state.maxBaseHp);
  }

  public destroy(): void {
    this._subs.flush();
    this._view = null;
    this._events = null;
    this._state = null;
  }
}
