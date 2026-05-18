import type { BoardModel } from "../models/BoardModel";
import { DeckFactory } from "./DeckFactory";
import { Shuffler } from "./Shuffler";
import type { IRng } from "./SeededRng";

/**
 * Pre-deal arrangement used to visually verify card rendering — not the
 * Klondike deal. Exercises: red vs black suits, face-up vs face-down,
 * and the slot's stackingOffset (via the tableau-1 fan).
 */
export class SamplePlacement {
  public static apply(boardModel: BoardModel, rng: IRng): void {
    const deck = DeckFactory.createStandardDeck();
    Shuffler.shuffleInPlace(deck, rng);
    let cursor = 0;
    const draw = (): ReturnType<typeof deck.pop> => {
      if (cursor >= deck.length) return undefined;
      const card = deck[cursor];
      cursor += 1;
      return card;
    };

    const place = (slotId: string, count: number, faceUp: boolean): void => {
      const slot = boardModel.getSlotById(slotId);
      if (!slot) return;
      for (let i = 0; i < count; i++) {
        const card = draw();
        if (!card) return;
        card.setFaceUp(faceUp);
        slot.pushCard(card);
      }
    };

    place("stock", 6, false);
    place("waste", 1, true);
    place("foundation-1", 1, true);

    // tableau-1: 1 face-down then 2 face-up — verifies stackingOffset across
    // a mixed face-down/face-up fan.
    place("tableau-1", 1, false);
    place("tableau-1", 2, true);

    // tableau-3: a longer face-up fan to make the stacking offset obvious.
    place("tableau-3", 4, true);
  }
}
