import { SlotType } from "../constants/SlotType";
import { Pile } from "./Pile";
import { FLUSH_STACK } from "./StackingOffset";

export class WastePile extends Pile {
  private readonly _drawCount: number;
  private readonly _fanX: number;

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
   * Fan the topmost `drawCount` cards to the right so the player can
   * see at a glance how many came across in the last draw. Older
   * cards stack flush beneath the fan. Falls back to flush stacking
   * when `drawCount <= 1` or `fanX === 0` (Turn 1 mode).
   */
  public override getCardOffset(index: number): { readonly x: number; readonly z: number } {
    if (this._drawCount <= 1 || this._fanX === 0) return { x: 0, z: 0 };
    const fanStart = Math.max(0, this._cards.length - this._drawCount);
    if (index < fanStart) return { x: 0, z: 0 };
    return { x: this._fanX * (index - fanStart), z: 0 };
  }
}
