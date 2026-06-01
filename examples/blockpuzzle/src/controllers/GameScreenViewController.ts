import { UnsubscribeBag, type IInstanceResolver, type IViewController } from "@gamebyte/gamelabsjs";
import { BlockPuzzleConfig } from "../BlockPuzzleConfig";
import { GameState } from "../constants/GameState";
import { ComboModel } from "../models/ComboModel";
import { GameStateModel } from "../models/GameStateModel";
import { ScoreModel } from "../models/ScoreModel";
import { TimerModel } from "../models/TimerModel";
import { TimeFormatter } from "../utilities/TimeFormatter";
import type { IGameScreenView } from "../views/IGameScreenView";

// Game-over text colour. Tints the centered label (which renders at
// white) so the rendered colour ends up as a clearly-different hue
// against the dark board background.
const GAME_OVER_COLOR = 0xff5555;
const GAME_OVER_TEXT = "NO MOVES LEFT";

/**
 * HUD controller for the game screen. Subscribes to the score,
 * timer, and game-state models; pushes their values into the view's
 * three render targets (score label, time label, centered end-state
 * label).
 *
 * Time formatting goes through {@link TimeFormatter} (lifted from
 * Solitaire), so the `BlockPuzzleConfig.time` direction / format
 * settings drive how the rendered string looks. Score formatting is
 * a single `"Score: N"` template here — the controller owns the
 * prefix so the view stays render-only.
 */
export class GameScreenViewController implements IViewController<IGameScreenView> {
  private _view: IGameScreenView | null = null;
  private _config: BlockPuzzleConfig | null = null;
  private _scoreModel: ScoreModel | null = null;
  private _timerModel: TimerModel | null = null;
  private _gameState: GameStateModel | null = null;
  private _comboModel: ComboModel | null = null;
  private _lastTimeText = "";
  private readonly _subs = new UnsubscribeBag();

  public inject(resolver: IInstanceResolver): void {
    this._config = resolver.getInstance(BlockPuzzleConfig);
    this._scoreModel = resolver.getInstance(ScoreModel);
    this._timerModel = resolver.getInstance(TimerModel);
    this._gameState = resolver.getInstance(GameStateModel);
    this._comboModel = resolver.getInstance(ComboModel);
  }

  public initialize(view: IGameScreenView): void {
    this._view = view;

    if (this._scoreModel) {
      view.setScoreText(GameScreenViewController.formatScore(this._scoreModel.value));
      this._subs.add(this._scoreModel.onChange((v) => view.setScoreText(GameScreenViewController.formatScore(v))));
    }
    if (this._timerModel && this._config) {
      this.pushTimeText(view, this._timerModel.elapsedSeconds);
      this._subs.add(this._timerModel.onChange((elapsed) => this.pushTimeText(view, elapsed)));
    }
    if (this._gameState) {
      view.setEndStateLabel(this.endStateLabelFor(this._gameState.state));
      this._subs.add(this._gameState.onStateChanged((state) => view.setEndStateLabel(this.endStateLabelFor(state))));
    }
    if (this._comboModel) {
      view.setComboState({ level: this._comboModel.level, movesRemaining: this._comboModel.movesRemaining });
      this._subs.add(
        this._comboModel.onChange((m) => view.setComboState({ level: m.level, movesRemaining: m.movesRemaining })),
      );
    }
  }

  public destroy(): void {
    this._subs.flush();
    this._view = null;
    this._config = null;
    this._scoreModel = null;
    this._timerModel = null;
    this._gameState = null;
    this._comboModel = null;
    this._lastTimeText = "";
  }

  /**
   * Resolve elapsed seconds through the configured direction +
   * format, dedupe redundant updates (the underlying timer fires
   * every step but `mm:ss` only changes once per wall-clock second).
   *
   * Doubles as the zero-detection point for count-down mode: once
   * the displayed seconds hits zero while still Playing, transition
   * to GameOver so the timer freezes (App's onStep gates ticks on
   * Playing) and the end-state label shows. Same pattern Solitaire
   * uses for its TimeOver state.
   */
  private pushTimeText(view: IGameScreenView, elapsed: number): void {
    if (!this._config) return;
    const seconds = TimeFormatter.displaySeconds(elapsed, this._config.time);
    const text = TimeFormatter.format(seconds, this._config.time.displayFormat);
    if (text !== this._lastTimeText) {
      this._lastTimeText = text;
      view.setTimeText(text);
    }
    if (
      this._config.time.direction === "down" &&
      seconds <= 0 &&
      this._gameState !== null &&
      this._gameState.state === GameState.Playing
    ) {
      this._gameState.setState(GameState.GameOver);
    }
  }

  private endStateLabelFor(state: GameState): { readonly text: string; readonly color: number } | null {
    switch (state) {
      case GameState.GameOver:
        return { text: GAME_OVER_TEXT, color: GAME_OVER_COLOR };
      default:
        return null;
    }
  }

  private static formatScore(value: number): string {
    return `Score: ${value}`;
  }
}
