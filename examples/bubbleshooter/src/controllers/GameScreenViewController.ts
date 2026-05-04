import { OnScreenControlManager, UnsubscribeBag, type IInstanceResolver, type IViewController } from "@gamebyte/gamelabsjs";
import type { IGameScreenView } from "../views/IGameScreenView";
import { GameEvents } from "../events/GameEvents";
import { GameOperations } from "../utilities/GameOperations";
import { BubbleShooterUIIds } from "../BubbleShooterUIIds";

export class GameScreenViewController implements IViewController<IGameScreenView> {
  private _view: IGameScreenView | null = null;
  private readonly _subs = new UnsubscribeBag();
  private _gameEvents: GameEvents | null = null;
  private _osc: OnScreenControlManager | null = null;
  private _ops: GameOperations | null = null;

  public inject(resolver: IInstanceResolver): void {
    this._gameEvents = resolver.getInstance(GameEvents);
    this._osc = resolver.getInstance(OnScreenControlManager);
    this._ops = resolver.getInstance(GameOperations);
  }

  public initialize(view: IGameScreenView): void {
    this._view = view;
    const e = this._gameEvents!;
    const osc = this._osc!;
    this._subs.add(e.onScoreChanged((value) => osc.setLabelText(BubbleShooterUIIds.ScoreLabel, `Score: ${value}`)));
    this._subs.add(e.onBombCountChanged((count) => osc.setLabelText(BubbleShooterUIIds.BombCountLabel, `${count}`)));
    this._subs.add(e.onFireballCountChanged((count) => osc.setLabelText(BubbleShooterUIIds.FireballCountLabel, `${count}`)));
    this._subs.add(e.onPowerUpAvailabilityChanged((bomb, fireball) => this._onPowerUpAvailability(bomb, fireball)));
    this._subs.add(e.onGameWonChanged((won) => osc.setControlVisible(BubbleShooterUIIds.WinLabel, won)));
    this._subs.add(e.onGameOverChanged((over) => osc.setControlVisible(BubbleShooterUIIds.GameOverLabel, over)));
    this._subs.add(this._view.onLevelChanged((id) => this._ops?.loadLevel(id)));
  }

  private _onPowerUpAvailability(bombEnabled: boolean, fireballEnabled: boolean): void {
    this._osc?.setControlEnabled(BubbleShooterUIIds.BombButton, bombEnabled);
    this._osc?.setControlEnabled(BubbleShooterUIIds.FireballButton, fireballEnabled);
  }

  public destroy(): void {
    this._subs.flush();
    this._view = null;
    this._gameEvents = null;
    this._osc = null;
    this._ops = null;
  }
}
