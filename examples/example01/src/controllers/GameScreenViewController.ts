import { UnsubscribeBag, type IInstanceResolver, type IViewController } from "gamelabsjs";
import type { IGameScreenView } from "../views/IGameScreenView";

export class GameScreenController implements IViewController<IGameScreenView> {
  private view: IGameScreenView | null = null;
  private readonly subs = new UnsubscribeBag();

  initialize(view: IGameScreenView, _resolver: IInstanceResolver): void {
    this.view = view;
  }

  destroy(): void {
    this.subs.flush();
    this.view = null;
  }
}

