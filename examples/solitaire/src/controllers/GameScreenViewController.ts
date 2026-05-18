import { UnsubscribeBag, type IInstanceResolver, type IViewController } from "@gamebyte/gamelabsjs";
import type { IGameScreenView } from "../views/IGameScreenView";
import { UndoEvents } from "../models/UndoEvents";
import { ScoreModel } from "../models/ScoreModel";
import { TimerModel } from "../models/TimerModel";
import { GameStateModel, GameState } from "../models/GameStateModel";
import { TimeFormatter } from "../utilities/TimeFormatter";
import { SolitaireConfig } from "../SolitaireConfig";

export class GameScreenViewController implements IViewController<IGameScreenView> {
  private _view: IGameScreenView | null = null;
  private _undoEvents: UndoEvents | null = null;
  private _scoreModel: ScoreModel | null = null;
  private _timerModel: TimerModel | null = null;
  private _gameState: GameStateModel | null = null;
  private _config: SolitaireConfig | null = null;
  private _lastTimeText = "";
  private readonly _subs = new UnsubscribeBag();

  public inject(resolver: IInstanceResolver): void {
    this._undoEvents = resolver.getInstance(UndoEvents);
    this._scoreModel = resolver.getInstance(ScoreModel);
    this._timerModel = resolver.getInstance(TimerModel);
    this._gameState = resolver.getInstance(GameStateModel);
    this._config = resolver.getInstance(SolitaireConfig);
  }

  public initialize(view: IGameScreenView): void {
    this._view = view;
    this._subs.add(view.onUndoClicked(() => this._undoEvents?.request()));

    if (this._scoreModel) {
      view.setScoreText(this.formatScore(this._scoreModel.value));
      this._subs.add(this._scoreModel.onChange((value) => view.setScoreText(this.formatScore(value))));
    }
    if (this._timerModel) {
      this.pushTimeText(view, this._timerModel.elapsedSeconds);
      this._subs.add(this._timerModel.onChange((elapsed) => this.pushTimeText(view, elapsed)));
    }
    if (this._gameState) {
      view.setGameOver(this._gameState.state === GameState.GameOver);
      this._subs.add(this._gameState.onStateChanged((state) => view.setGameOver(state === GameState.GameOver)));
    }
  }

  public destroy(): void {
    this._subs.flush();
    this._view = null;
    this._undoEvents = null;
    this._scoreModel = null;
    this._timerModel = null;
    this._gameState = null;
    this._config = null;
    this._lastTimeText = "";
  }

  private formatScore(value: number): string {
    return `Score: ${value}`;
  }

  /**
   * Resolve the elapsed time through the configured direction +
   * format, then push to the view only when the rendered string
   * actually changes. `TimerModel.tick` fires every simulation step
   * (60Hz); the rendered mm:ss only changes once per wall-clock
   * second, so deduping here saves a PIXI.Text rebuild on most ticks.
   *
   * Also serves as the zero-detection point for count-down mode:
   * once the resolved display value reaches zero while in the
   * Playing state, flip the game state to GameOver. SolitaireApp's
   * onStep then stops feeding the timer.
   */
  private pushTimeText(view: IGameScreenView, elapsed: number): void {
    if (!this._config) return;
    const seconds = TimeFormatter.displaySeconds(elapsed, this._config.time);
    const text = TimeFormatter.format(seconds, this._config.time.displayFormat);
    if (text !== this._lastTimeText) {
      this._lastTimeText = text;
      view.setTimeText(text);
    }
    if (this._config.time.direction === "down" && seconds <= 0 && this._gameState !== null && this._gameState.state === GameState.Playing) {
      this._gameState.setState(GameState.GameOver);
    }
  }
}
