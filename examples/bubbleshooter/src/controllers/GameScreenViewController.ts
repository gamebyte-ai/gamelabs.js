import { OnScreenControlManager, UnsubscribeBag, type IInstanceResolver, type IViewController } from "@gamebyte/gamelabsjs";
import type { IGameScreenView } from "../views/IGameScreenView";
import { GameEvents } from "../events/GameEvents";
import { GameOperations } from "../utilities/GameOperations";
import {
  BOMB_BUTTON_ID,
  BOMB_COUNT_LABEL_ID,
  FIREBALL_BUTTON_ID,
  FIREBALL_COUNT_LABEL_ID,
  SCORE_CONTROL_ID,
  WIN_LABEL_ID,
} from "../BubbleShooterApp";

export class GameScreenViewController implements IViewController<IGameScreenView> {
  private _view: IGameScreenView | null = null;
  private readonly _subs = new UnsubscribeBag();
  private _gameEvents: GameEvents | null = null;
  private _osc: OnScreenControlManager | null = null;
  private _ops: GameOperations | null = null;
  private _bombCount = 0;
  private _fireballCount = 0;
  private _controlsLocked = false;

  public inject(resolver: IInstanceResolver): void {
    this._gameEvents = resolver.getInstance(GameEvents);
    this._osc = resolver.getInstance(OnScreenControlManager);
    this._ops = resolver.getInstance(GameOperations);
  }

  public initialize(view: IGameScreenView): void {
    this._view = view;
    this._subs.add(this._gameEvents!.onScoreChanged((value) => this._osc?.setLabelText(SCORE_CONTROL_ID, `Score: ${value}`)));
    this._subs.add(this._gameEvents!.onBombCountChanged((count) => this._onBombCountChanged(count)));
    this._subs.add(this._gameEvents!.onFireballCountChanged((count) => this._onFireballCountChanged(count)));
    this._subs.add(this._gameEvents!.onShooterControlsLocked((locked) => this._onControlsLocked(locked)));
    this._subs.add(this._gameEvents!.onGameWonChanged((won) => this._osc?.setControlVisible(WIN_LABEL_ID, won)));
    this._subs.add(this._view.onLevelChanged((id) => this._ops?.loadLevel(id)));
  }

  private _onBombCountChanged(count: number): void {
    this._bombCount = count;
    this._osc?.setLabelText(BOMB_COUNT_LABEL_ID, `${count}`);
    this._refreshButtonEnabled();
  }

  private _onFireballCountChanged(count: number): void {
    this._fireballCount = count;
    this._osc?.setLabelText(FIREBALL_COUNT_LABEL_ID, `${count}`);
    this._refreshButtonEnabled();
  }

  private _onControlsLocked(locked: boolean): void {
    this._controlsLocked = locked;
    this._refreshButtonEnabled();
  }

  /**
   * Power-up buttons are enabled when the player has stock AND the
   * controls aren't locked (lock fires the moment the grid empties so
   * the buttons go dead before the win message appears).
   */
  private _refreshButtonEnabled(): void {
    const unlocked = !this._controlsLocked;
    this._osc?.setControlEnabled(BOMB_BUTTON_ID, unlocked && this._bombCount > 0);
    this._osc?.setControlEnabled(FIREBALL_BUTTON_ID, unlocked && this._fireballCount > 0);
  }

  public destroy(): void {
    this._subs.flush();
    this._view = null;
    this._gameEvents = null;
    this._osc = null;
    this._ops = null;
  }
}
