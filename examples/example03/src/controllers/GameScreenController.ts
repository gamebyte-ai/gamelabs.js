import { UnsubscribeBag, type IInstanceResolver, type IViewController } from "gamelabsjs";
import type { IGameScreenView } from "../views/IGameScreenView";

export class GameScreenController implements IViewController<IGameScreenView> {
  private _view: IGameScreenView | null = null;
  private readonly _subs = new UnsubscribeBag();

  public initialize(view: IGameScreenView, _resolver: IInstanceResolver): void {
    this._view = view;
  }

  public destroy(): void {
    this._subs.flush();
    this._view = null;
  }
}
