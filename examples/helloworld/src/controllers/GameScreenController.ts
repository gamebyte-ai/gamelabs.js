import { UnsubscribeBag, type IInstanceResolver, type IViewController } from "@gamebyte/gamelabsjs";
import type { IGameScreenView } from "../views/IGameScreenView";

export class GameScreenController implements IViewController<IGameScreenView> {
  private view: IGameScreenView | null = null;
  private readonly subs = new UnsubscribeBag();

  inject(_resolver: IInstanceResolver): void {}

  initialize(view: IGameScreenView): void {
    this.view = view;
  }

  destroy(): void {
    this.subs.flush();
    this.view = null;
  }
}

