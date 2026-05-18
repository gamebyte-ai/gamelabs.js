import { UnsubscribeBag, type IInstanceResolver, type IViewController } from "@gamebyte/gamelabsjs";
import type { CardClickedInfo, CardsDragReleaseInfo, IBoardView } from "../views/IBoardView";
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
    this._subs.add(view.onCardClicked((info) => this.onCardClicked(info)));
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
      this._view.commitDragRelease(null);
      return;
    }
    const moving = info.originPile.cards.slice(info.fromIndex);
    if (!target.canPlace(moving)) {
      this._view.commitDragRelease(null);
      return;
    }

    CardMoveOperations.moveCards(info.originPile, info.fromIndex, target);
    const autoFlippedCardId = this.maybeAutoFlipNewTop(info.originPile);
    this._view.commitDragRelease(autoFlippedCardId);
  }

  private onCardClicked(info: CardClickedInfo): void {
    if (!this._view || !this._board) return;
    // Quick placement targets foundations only, which accept single
    // cards. Multi-card runs from the middle of a tableau column
    // cannot be auto-routed, so only the topmost card of any pile
    // is eligible.
    if (info.fromIndex !== info.pile.cards.length - 1) return;
    const card = info.pile.cards[info.fromIndex];
    let destination: IPile | null = null;
    for (const foundation of this._board.foundations) {
      if (foundation.canPlace([card])) {
        destination = foundation;
        break;
      }
    }
    if (destination === null) return;
    CardMoveOperations.moveCards(info.pile, info.fromIndex, destination);
    const autoFlippedCardId = this.maybeAutoFlipNewTop(info.pile);
    this._view.animateQuickPlacement(card.id, autoFlippedCardId);
  }

  /**
   * If the pile's new top (after a move out) needs to flip face-up,
   * record its id and mutate its face state. Returns the flipped
   * card's id, or null if nothing needed flipping. The view animates
   * the flip visually using the recorded id.
   */
  private maybeAutoFlipNewTop(pile: IPile): number | null {
    if (!pile.needsAutoFlipNewTop()) return null;
    const top = pile.topCard;
    if (top === null) return null;
    const cardId = top.id;
    CardMoveOperations.flipTopCard(pile, true);
    return cardId;
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
