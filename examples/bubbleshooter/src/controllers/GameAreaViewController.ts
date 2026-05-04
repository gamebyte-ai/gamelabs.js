import { UnsubscribeBag, UpdateManager, type IInstanceResolver, type IViewController } from "@gamebyte/gamelabsjs";
import type { IGameAreaView } from "../views/IGameAreaView";
import type { BubbleColor } from "../constants/BubbleColor";
import { GameEvents } from "../events/GameEvents";
import { GameOperations } from "../utilities/GameOperations";

export class GameAreaViewController implements IViewController<IGameAreaView> {
  private _view: IGameAreaView | null = null;
  private readonly _subs = new UnsubscribeBag();
  private _gameEvents: GameEvents | null = null;
  private _ops: GameOperations | null = null;
  private _updateManager: UpdateManager | null = null;
  private _bombActive = false;
  private _fireballActive = false;

  public inject(resolver: IInstanceResolver): void {
    this._gameEvents = resolver.getInstance(GameEvents);
    this._ops = resolver.getInstance(GameOperations);
    this._updateManager = resolver.getInstance(UpdateManager);
  }

  public initialize(view: IGameAreaView): void {
    this._view = view;
    this._subs.add(this._gameEvents!.onBubblePlaced((r, c, color) => this._view?.setBubble(r, c, color)));
    this._subs.add(this._gameEvents!.onBubbleRemoved((r, c) => this._view?.removeBubble(r, c)));
    this._subs.add(this._gameEvents!.onShooterColorChanged((color) => this._view?.setShooterHeldColor(color)));
    this._subs.add(this._gameEvents!.onShooterNextColorChanged((color) => this._view?.setShooterNextColor(color)));
    this._subs.add(this._gameEvents!.onShooterBombChanged((active) => this._onBombChanged(active)));
    this._subs.add(this._gameEvents!.onShooterFireballChanged((active) => this._onFireballChanged(active)));
    this._subs.add(this._gameEvents!.onShooterAimChanged((angle) => this._view?.setShooterAimAngle(angle)));
    this._subs.add(this._gameEvents!.onAimTrajectoryChanged((traj) => this._view?.setAimTrajectory(traj)));
    this._subs.add(this._gameEvents!.onFlyingBubbleChanged((color, x, y) => this._view?.setFlyingBubble(color, x, y)));
    this._subs.add(this._gameEvents!.onFlyingBombChanged((active, x, y) => this._view?.setFlyingBomb(active, x, y)));
    this._subs.add(this._gameEvents!.onFireballChanged((active, x, y) => this._view?.setFireball(active, x, y)));
    this._subs.add(this._gameEvents!.onBubblePopped((x, y, color, points) => this._onBubblePopped(x, y, color, points)));
    this._subs.add(this._gameEvents!.onFallingBubbleChanged((id, color, x, y) => this._view?.setFallingBubble(id, color, x, y)));
    this._subs.add(this._view.onAimAtWorld((x, y) => this._ops?.aimAt(x, y)));
    this._subs.add(this._view.onFire(() => this._ops?.fire()));
    this._subs.add(this._view.onSwap(() => this._ops?.swap()));
    this._subs.add(this._updateManager!.register((dt) => this._tick(dt), 0));
    this._ops!.start();
  }

  private _tick(dt: number): void {
    this._ops?.update(dt);
    this._view?.updateAimDots(dt);
    this._view?.updateParticles(dt);
    this._view?.updateScorePopups(dt);
  }

  private _onBubblePopped(x: number, y: number, color: BubbleColor, points: number): void {
    this._view?.playPopBurst(x, y, color);
    this._view?.playScorePopup(x, y, color, points);
  }

  private _onBombChanged(active: boolean): void {
    this._bombActive = active;
    this._view?.setShooterIsBomb(active);
    this._view?.setAimPowerUpMode(this._bombActive || this._fireballActive);
  }

  private _onFireballChanged(active: boolean): void {
    this._fireballActive = active;
    this._view?.setShooterIsFireball(active);
    this._view?.setAimPowerUpMode(this._bombActive || this._fireballActive);
  }

  public destroy(): void {
    this._subs.flush();
    this._view = null;
    this._gameEvents = null;
    this._ops = null;
    this._updateManager = null;
  }
}
