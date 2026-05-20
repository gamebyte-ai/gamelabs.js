import type { IBoardModel } from "../models/IBoardModel";
import { Card } from "../models/Card";
import { Pile } from "../models/Pile";
import type { UndoRecord } from "../models/UndoRecord";
import { CardMoveOperations } from "./CardMoveOperations";

/**
 * Reverses a single {@link UndoRecord} against the board model. Pure
 * model mutation — the caller is responsible for driving any view
 * animation in response. Bypasses the standard placement rules
 * (foundations, tableaux) since undo can legitimately push cards
 * back into positions that wouldn't be reachable forward.
 *
 * Waste fan layout is derived purely from the current waste length,
 * so no anchor restoration is needed — popping cards back to stock
 * (or pushing them back to waste) automatically realigns the fan.
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
  }

  private static undoDraw(board: IBoardModel, record: Extract<UndoRecord, { kind: "draw" }>): void {
    const stockPile = board.stock as Pile;
    const wastePile = board.waste as Pile;
    // Mirrors `StockOperations.drawToWaste`'s reverse-push: pop the
    // drawn cards off the waste, then push them back to stock in
    // reverse order so the pre-draw stock order is exactly restored.
    const buffer: Card[] = [];
    for (let i = 0; i < record.count; i++) {
      const card = wastePile.popCard();
      if (!card) break;
      card.setFaceUp(false);
      buffer.push(card);
    }
    for (let i = buffer.length - 1; i >= 0; i--) {
      stockPile.pushCard(buffer[i]);
    }
  }

  private static undoRecycle(board: IBoardModel, record: Extract<UndoRecord, { kind: "recycle" }>): void {
    const stockPile = board.stock as Pile;
    const wastePile = board.waste as Pile;
    for (let i = 0; i < record.count; i++) {
      const card = stockPile.popCard();
      if (!card) break;
      card.setFaceUp(true);
      wastePile.pushCard(card);
    }
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
