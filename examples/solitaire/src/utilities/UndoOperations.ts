import type { IBoardModel } from "../models/IBoardModel";
import { Card } from "../models/Card";
import { Pile } from "../models/Pile";
import { WastePile } from "../models/WastePile";
import type { UndoRecord } from "../models/UndoRecord";
import { CardMoveOperations } from "./CardMoveOperations";

/**
 * Reverses a single {@link UndoRecord} against the board model. Pure
 * model mutation — the caller is responsible for driving any view
 * animation in response. Bypasses the standard placement rules
 * (foundations, tableaux) since undo can legitimately push cards
 * back into positions that wouldn't be reachable forward.
 *
 * For variants that touch the waste pile, restores the captured
 * `_fanAnchorIndex` after the cards have been moved — `WastePile.popCard`
 * collapses the anchor to −1 when the current fan batch empties, so a
 * pure pop/push pair is not enough to recover the prior fan layout.
 */
export class UndoOperations {
  public static undo(board: IBoardModel, record: UndoRecord): void {
    switch (record.kind) {
      case "move":
        UndoOperations.undoMove(board, record);
        return;
      case "draw":
        UndoOperations.undoDraw(board, record);
        return;
      case "recycle":
        UndoOperations.undoRecycle(board, record);
        return;
    }
  }

  private static undoMove(board: IBoardModel, record: Extract<UndoRecord, { kind: "move" }>): void {
    if (record.autoFlippedCardId !== null) {
      const card = UndoOperations.findCardById(board, record.autoFlippedCardId);
      card?.setFaceUp(false);
    }
    const fromIndex = record.target.cards.length - record.count;
    CardMoveOperations.moveCards(record.target, fromIndex, record.origin);
    if (record.wastePreviousFanAnchorIndex !== null) {
      (board.waste as WastePile).setFanAnchorIndex(record.wastePreviousFanAnchorIndex);
    }
  }

  private static undoDraw(board: IBoardModel, record: Extract<UndoRecord, { kind: "draw" }>): void {
    const stockPile = board.stock as Pile;
    const wastePile = board.waste as WastePile;
    for (let i = 0; i < record.count; i++) {
      const card = wastePile.popCard();
      if (!card) break;
      card.setFaceUp(false);
      stockPile.pushCard(card);
    }
    wastePile.setFanAnchorIndex(record.previousFanAnchorIndex);
  }

  private static undoRecycle(board: IBoardModel, record: Extract<UndoRecord, { kind: "recycle" }>): void {
    const stockPile = board.stock as Pile;
    const wastePile = board.waste as WastePile;
    for (let i = 0; i < record.count; i++) {
      const card = stockPile.popCard();
      if (!card) break;
      card.setFaceUp(true);
      wastePile.pushCard(card);
    }
    wastePile.setFanAnchorIndex(record.previousFanAnchorIndex);
  }

  private static findCardById(board: IBoardModel, cardId: number): Card | null {
    for (const pile of board.allPiles) {
      for (const card of pile.cards) {
        if (card.id === cardId) return card as Card;
      }
    }
    return null;
  }
}
