import type { IPile } from "../models/IPile";
import { Pile } from "../models/Pile";

/**
 * Klondike stock/waste flow. Draws cards from the top of stock to waste
 * (face-up) and recycles waste back into stock (face-down) when stock
 * is empty. Recycle reverses the waste order so an unbroken cycle
 * restores the original stock order.
 */
export class StockOperations {
  public static drawToWaste(stock: IPile, waste: IPile, count: number): void {
    const stockPile = stock as Pile;
    const wastePile = waste as Pile;
    // Anchor the about-to-be-pushed cards as a fresh batch so the
    // waste pile can keep their fan positions fixed as the player
    // removes them from the top.
    wastePile.onBatchPushStarting();
    for (let i = 0; i < count; i++) {
      const card = stockPile.popCard();
      if (!card) return;
      card.setFaceUp(true);
      wastePile.pushCard(card);
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
