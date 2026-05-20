import type { Card } from "../models/Card";
import type { IPile } from "../models/IPile";
import { Pile } from "../models/Pile";

/**
 * Klondike stock/waste flow. Draws cards from the top of stock to waste
 * (face-up, packet-flip semantic — the original stock top lands as
 * the new waste top) and recycles waste back into stock (face-down)
 * when stock is empty. Recycle reverses the waste order so an
 * unbroken cycle restores the original stock order.
 */
export class StockOperations {
  public static drawToWaste(stock: IPile, waste: IPile, count: number): void {
    const stockPile = stock as Pile;
    const wastePile = waste as Pile;
    // Pop the packet first, then push to waste in reverse order so
    // the card that was on top of stock ends up on top of waste —
    // the player sees the visible top of stock animate to the visible
    // (draggable) top of waste, rather than to the bottom of the new
    // fan batch.
    const drawn: Card[] = [];
    for (let i = 0; i < count; i++) {
      const card = stockPile.popCard();
      if (!card) break;
      card.setFaceUp(true);
      drawn.push(card);
    }
    for (let i = drawn.length - 1; i >= 0; i--) {
      wastePile.pushCard(drawn[i]);
    }
  }

  public static recycleWasteToStock(stock: IPile, waste: IPile): void {
    const stockPile = stock as Pile;
    const wastePile = waste as Pile;
    while (true) {
      const card = wastePile.popCard();
      if (!card) return;
      card.setFaceUp(false);
      stockPile.pushCard(card);
    }
  }
}
