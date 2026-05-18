import { UnsubscribeBag, type IInstanceResolver, type IViewController } from "@gamebyte/gamelabsjs";
import type { CardsDragReleaseInfo, IBoardView } from "../views/IBoardView";
import { IBoardModel } from "../models/IBoardModel";
import type { IPile } from "../models/IPile";
import { CardMoveOperations } from "../utilities/CardMoveOperations";
import { StockOperations } from "../utilities/StockOperations";
import { SolitaireConfig } from "../SolitaireConfig";

export class BoardViewController implements IViewController<IBoardView> {
  private _view: IBoardView | null = null;
  private _board: IBoardModel | null = null;
  private _config: SolitaireConfig | null = null;
  private readonly _subs = new UnsubscribeBag();

  public inject(resolver: IInstanceResolver): void {
    this._board = resolver.getInstance(IBoardModel);
    this._config = resolver.getInstance(SolitaireConfig);
  }

  public initialize(view: IBoardView): void {
    if (!this._board) throw new Error("BoardViewController: board model not injected");
    this._view = view;
    view.bindBoard(this._board);
    view.setDragEligibilityPredicate((pile, fromIndex) => pile.canDragFrom(fromIndex));
    this._subs.add(view.onCardsDragReleased((info) => this.onCardsDragReleased(info)));
    this._subs.add(view.onPileTapped((pile) => this.onPileTapped(pile)));
    view.refresh();
  }

  public destroy(): void {
    this._subs.flush();
    this._view?.setDragEligibilityPredicate(null);
    this._view = null;
    this._board = null;
    this._config = null;
  }

  private onCardsDragReleased(info: CardsDragReleaseInfo): void {
    if (!this._view) return;
    const target = info.targetPile;
    if (target === null || target === info.originPile) {
      this._view.commitDragRelease();
      return;
    }
    const moving = info.originPile.cards.slice(info.fromIndex);
    if (!target.canPlace(moving)) {
      this._view.commitDragRelease();
      return;
    }

    CardMoveOperations.moveCards(info.originPile, info.fromIndex, target);
    if (info.originPile.needsAutoFlipNewTop()) {
      CardMoveOperations.flipTopCard(info.originPile, true);
    }
    this._view.commitDragRelease();
  }

  private onPileTapped(pile: IPile): void {
    if (!this._view || !this._board || !this._config) return;
    if (pile !== this._board.stock) return;
    if (this._board.stock.cards.length > 0) {
      StockOperations.drawToWaste(this._board.stock, this._board.waste, this._config.drawCount);
    } else {
      StockOperations.recycleWasteToStock(this._board.stock, this._board.waste);
    }
    this._view.refresh();
  }
}
