import { OnScreenControlManager, UnsubscribeBag, type IInstanceResolver, type IViewController } from "@gamebyte/gamelabsjs";
import type { IGameScreenView } from "../views/IGameScreenView";
import { GameEvents } from "../events/GameEvents";
import { GameOperations } from "../utilities/GameOperations";
import { SCORE_CONTROL_ID } from "../BubbleShooterApp";

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
    this._subs.add(this._gameEvents!.onScoreChanged((value) => this._osc?.setLabelText(SCORE_CONTROL_ID, `Score: ${value}`)));
    this._subs.add(this._view.onLevelChanged((id) => this._ops?.loadLevel(id)));
  }

  public destroy(): void {
    this._subs.flush();
    this._view = null;
    this._gameEvents = null;
    this._osc = null;
    this._ops = null;
  }
}
