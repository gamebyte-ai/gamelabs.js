import type { BoardModel } from "../models/BoardModel";
import type { Slot } from "../models/Slot";
import type { Card } from "../models/Card";
import type { IRng } from "./IRng";
import { DeckOperations } from "./DeckOperations";
import { ShuffleOperations } from "./ShuffleOperations";

const TABLEAU_COLUMN_COUNT = 7;

/**
 * Variant-specific Klondike deal. Mutates the supplied board:
 *   - Tableau columns 1..7 get 1..7 cards (column index i gets i+1).
 *   - Only the top card of each tableau column is face-up.
 *   - Remaining 24 cards go to the stock pile, all face-down.
 *   - Waste and foundations are left empty.
 */
export class KlondikeDealOperations {
  public static deal(boardModel: BoardModel, rng: IRng): void {
    const deck = DeckOperations.createStandardDeck();
    ShuffleOperations.shuffleInPlace(deck, rng);

    for (let col = 0; col < TABLEAU_COLUMN_COUNT; col++) {
      const slot = boardModel.getSlotById(`tableau-${col + 1}`);
      if (!slot) throw new Error(`KlondikeDealOperations: missing tableau slot at column ${col + 1}`);
      const cardCount = col + 1;
      for (let i = 0; i < cardCount; i++) {
        const card = KlondikeDealOperations.takeNext(deck);
        card.setFaceUp(false);
        slot.pushCard(card);
      }
      slot.topCard?.setFaceUp(true);
    }

    const stock = boardModel.getSlotById("stock");
    if (!stock) throw new Error("KlondikeDealOperations: missing stock slot");
    while (deck.length > 0) {
      const card = KlondikeDealOperations.takeNext(deck);
      card.setFaceUp(false);
      stock.pushCard(card);
    }

    KlondikeDealOperations.assertEmpty(boardModel.getSlotById("waste"), "waste");
    for (let i = 1; i <= 4; i++) {
      KlondikeDealOperations.assertEmpty(boardModel.getSlotById(`foundation-${i}`), `foundation-${i}`);
    }
  }

  private static takeNext(deck: Card[]): Card {
    const card = deck.shift();
    if (!card) throw new Error("KlondikeDealOperations: deck exhausted mid-deal");
    return card;
  }

  private static assertEmpty(slot: Slot | null, name: string): void {
    if (slot && slot.cards.length !== 0) {
      throw new Error(`KlondikeDealOperations: expected ${name} to start empty`);
    }
  }
}
