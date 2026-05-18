import type { SlotType } from "../constants/SlotType";
import type { ICard } from "./Card";
import type { StackingOffset } from "./StackingOffset";

/**
 * Read-only view of a board pile. Exposes the pile's identity, layout,
 * cards, and the polymorphic predicates that encode Klondike rules.
 */
export interface IPile {
  readonly type: SlotType;
  readonly worldX: number;
  readonly worldZ: number;
  readonly stackingOffset: StackingOffset;
  readonly cards: readonly ICard[];
  readonly topCard: ICard | null;
  canPlace(cards: readonly ICard[]): boolean;
  canDragFrom(index: number): boolean;
  needsAutoFlipNewTop(): boolean;
}
