import { UnsubscribeBag, type IInstanceResolver, type IViewController } from "@gamebyte/gamelabsjs";
import type { IGameAreaView } from "../views/IGameAreaView";

export class GameAreaViewController implements IViewController<IGameAreaView> {
  private _view: IGameAreaView | null = null;
  private readonly _subs = new UnsubscribeBag();

  public inject(_resolver: IInstanceResolver): void {}

  public initialize(view: IGameAreaView): void {
    this._view = view;
  }

  public destroy(): void {
    this._subs.flush();
    this._view = null;
  }
}
