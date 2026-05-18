import type { BoardModel } from "../models/BoardModel";
import type { Card } from "../models/Card";
import type { IRng } from "./IRng";
import { DeckOperations } from "./DeckOperations";
import { ShuffleOperations } from "./ShuffleOperations";

/**
 * Klondike deal. Mutates the supplied board:
 *   - Tableau columns 1..7 get 1..7 cards (column index i gets i+1).
 *   - Only the top card of each tableau column is face-up.
 *   - Remaining 24 cards go to the stock pile, all face-down.
 *   - Waste and foundations start empty.
 */
export class DealOperations {
  public static deal(board: BoardModel, rng: IRng): void {
    const deck = DeckOperations.createStandardDeck();
    ShuffleOperations.shuffleInPlace(deck, rng);

    for (let col = 0; col < board.tableau.length; col++) {
      const pile = board.tableau[col];
      const cardCount = col + 1;
      for (let i = 0; i < cardCount; i++) {
        const card = DealOperations.takeNext(deck);
        card.setFaceUp(false);
        pile.pushCard(card);
      }
      pile.topCard?.setFaceUp(true);
    }

    while (deck.length > 0) {
      const card = DealOperations.takeNext(deck);
      card.setFaceUp(false);
      board.stock.pushCard(card);
    }
  }

  private static takeNext(deck: Card[]): Card {
    const card = deck.shift();
    if (!card) throw new Error("DealOperations: deck exhausted mid-deal");
    return card;
  }
}
