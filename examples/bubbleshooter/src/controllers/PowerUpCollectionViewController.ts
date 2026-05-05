import { UnsubscribeBag, UpdateManager, type IInstanceResolver, type IViewController } from "@gamebyte/gamelabsjs";
import type { IPowerUpCollectionView } from "../views/IPowerUpCollectionView";
import { GameEvents } from "../events/GameEvents";

/**
 * Wires power-up collection events to the {@link IPowerUpCollectionView}
 * and ticks per-flight animations. One subscription per signal:
 * - `onPowerUpCollected` → spawn a new flight from the cell origin.
 * - `onLayoutChanged`    → drop in-flight icons on level reload.
 */
export class PowerUpCollectionViewController implements IViewController<IPowerUpCollectionView> {
  private _view: IPowerUpCollectionView | null = null;
  private readonly _subs = new UnsubscribeBag();
  private _gameEvents: GameEvents | null = null;
  private _updateManager: UpdateManager | null = null;

  public inject(resolver: IInstanceResolver): void {
    this._gameEvents = resolver.getInstance(GameEvents);
    this._updateManager = resolver.getInstance(UpdateManager);
  }

  public initialize(view: IPowerUpCollectionView): void {
    this._view = view;
    const e = this._gameEvents!;
    this._subs.add(e.onPowerUpCollected((kind, fromX, fromY) => this._view?.spawn(kind, fromX, fromY)));
    this._subs.add(e.onLayoutChanged(() => this._view?.clearAll()));
    this._subs.add(this._updateManager!.register((dt) => this._view?.tick(dt), 0));
  }

  public destroy(): void {
    this._subs.flush();
    this._view = null;
    this._gameEvents = null;
    this._updateManager = null;
  }
}
