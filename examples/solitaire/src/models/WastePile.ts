import { SlotType } from "../constants/SlotType";
import type { Card } from "./Card";
import { Pile } from "./Pile";
import { FLUSH_STACK } from "./StackingOffset";

export class WastePile extends Pile {
  private readonly _drawCount: number;
  private readonly _fanX: number;
  /** Index of the bottom-most card belonging to the most recent draw
   *  batch. Cards at this index and above fan rightward at fixed
   *  offsets (0, fanX, 2·fanX, ...); cards below stack flush. -1 means
   *  no fan is anchored (waste was empty / fully consumed since the
   *  last draw). */
  private _fanAnchorIndex: number = -1;

  public constructor(worldX: number, worldZ: number, drawCount: number, fanX: number) {
    super(SlotType.Waste, worldX, worldZ, FLUSH_STACK);
    this._drawCount = drawCount;
    this._fanX = fanX;
  }

  public canPlace(): boolean {
    return false;
  }

  public canDragFrom(index: number): boolean {
    if (index !== this._cards.length - 1) return false;
    return this._cards[index]?.faceUp === true;
  }

  /**
   * Fan the cards from the most recent draw batch at fixed offsets.
   * As cards are removed from the top, the remaining fan cards stay
   * exactly where the player last saw them — only the rightmost
   * positions are vacated. Older draws (cards below `_fanAnchorIndex`)
   * stack flush beneath. Falls back to flush stacking when
   * `drawCount <= 1` or `fanX === 0` (Turn 1 mode).
   */
  public override getCardOffset(index: number): { readonly x: number; readonly z: number } {
    if (this._drawCount <= 1 || this._fanX === 0) return { x: 0, z: 0 };
    if (this._fanAnchorIndex < 0 || index < this._fanAnchorIndex) return { x: 0, z: 0 };
    return { x: this._fanX * (index - this._fanAnchorIndex), z: 0 };
  }

  /**
   * Called by StockOperations.drawToWaste before pushing the batch.
   * The current `cards.length` becomes the new fan anchor, so the
   * about-to-be-pushed cards are addressed by their indices within
   * this batch.
   */
  public override onBatchPushStarting(): void {
    this._fanAnchorIndex = this._cards.length;
  }

  public get fanAnchorIndex(): number {
    return this._fanAnchorIndex;
  }

  /**
   * Sets the fan anchor directly. Used by undo to roll the anchor
   * back to the state captured before a draw, recycle, or waste-origin
   * move — `popCard` collapses the anchor to -1 when the current fan
   * batch empties, so a pure pop/push pair is not enough to recover
   * the prior fan layout.
   */
  public setFanAnchorIndex(value: number): void {
    this._fanAnchorIndex = value;
  }

  public override popCard(): Card | null {
    const card = super.popCard();
    // If the pop consumed the last card of the current fan batch, the
    // anchor is no longer meaningful — drop it so any remaining cards
    // (from earlier batches) render flush.
    if (this._fanAnchorIndex >= 0 && this._cards.length <= this._fanAnchorIndex) {
      this._fanAnchorIndex = -1;
    }
    return card;
  }

  public override clear(): void {
    super.clear();
    this._fanAnchorIndex = -1;
  }
}
