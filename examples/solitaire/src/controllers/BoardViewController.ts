import { UnsubscribeBag, type IInstanceResolver, type IViewController } from "@gamebyte/gamelabsjs";
import type { IBoardView } from "../views/IBoardView";
import { IBoardModel } from "../models/IBoardModel";
import { SolitaireConfig } from "../SolitaireConfig";

export class BoardViewController implements IViewController<IBoardView> {
  private _view: IBoardView | null = null;
  private _boardModel: IBoardModel | null = null;
  private _config: SolitaireConfig | null = null;
  private readonly _subs = new UnsubscribeBag();

  public inject(resolver: IInstanceResolver): void {
    this._boardModel = resolver.getInstance(IBoardModel);
    this._config = resolver.getInstance(SolitaireConfig);
  }

  public initialize(view: IBoardView): void {
    this._view = view;
    if (!this._boardModel || !this._config) return;
    const layout = this._boardModel.layout;
    if (!layout) return;
    this._view.setLayout(layout, this._config.slotPalettes);
  }

  public destroy(): void {
    this._subs.flush();
    this._view = null;
    this._boardModel = null;
    this._config = null;
  }
}
