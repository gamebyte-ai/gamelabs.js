import { SlotType } from "../constants/SlotType";
import { Pile } from "./Pile";
import { FLUSH_STACK } from "./StackingOffset";

export class WastePile extends Pile {
  public constructor(worldX: number, worldZ: number) {
    super(SlotType.Waste, worldX, worldZ, FLUSH_STACK);
  }

  public canPlace(): boolean {
    return false;
  }

  public canDragFrom(index: number): boolean {
    if (index !== this._cards.length - 1) return false;
    return this._cards[index]?.faceUp === true;
  }
}
