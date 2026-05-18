import type { IView, Unsubscribe } from "@gamebyte/gamelabsjs";
import type { IBoardModel } from "../models/IBoardModel";
import type { IPile } from "../models/IPile";

export interface CardsDragReleaseInfo {
  readonly originPile: IPile;
  readonly fromIndex: number;
  readonly targetPile: IPile | null;
}

export interface CardClickedInfo {
  readonly pile: IPile;
  readonly fromIndex: number;
}

export type DragEligibilityPredicate = (pile: IPile, fromIndex: number) => boolean;

export interface IBoardView extends IView {
  bindBoard(model: IBoardModel): void;
  refresh(): void;
  /** Animate the dragged stack from its release position to its
   *  destination in the current model state, then rebuild. The
   *  controller calls this in response to drag-release (snap-back or
   *  successful move) instead of {@link refresh}, so the cards do
   *  not snap instantly. If `autoFlippedCardId` is non-null, the
   *  view plays a flip animation on that card after the drag-release
   *  settles and before rebuilding (controller already mutated the
   *  card's face state to face-up). */
  commitDragRelease(autoFlippedCardId: number | null): void;
  /** Animate the card with `cardId` from its current rendered
   *  position to its destination in the current model state, then
   *  rebuild. Used for quick-placement (auto-route on click); has a
   *  faster, slightly arced trajectory distinct from the player-driven
   *  drag-release animation. If `autoFlippedCardId` is non-null, the
   *  view plays a flip animation on that card after the placement
   *  lands and before rebuilding. */
  animateQuickPlacement(cardId: number, autoFlippedCardId: number | null): void;
  /** One-shot game-start animation. Stacks the listed cards (in
   *  Klondike deal order) on top of the stock pile, then sequentially
   *  flies each one to its model-resting position face-down, and
   *  finally flips the top of each tableau column face-up. Calls
   *  `onComplete` after the last flip. Pointer input is blocked for
   *  the duration via the view's existing animation gate. */
  playDealAnimation(orderedCardIds: readonly number[], onComplete: () => void): void;
  onCardsDragReleased(callback: (info: CardsDragReleaseInfo) => void): Unsubscribe;
  /** Fired on a tap (pointer-down then pointer-up with no significant
   *  pointer movement) over a face-up card that passed the drag
   *  eligibility check. The drag itself never starts, so the card was
   *  never visually lifted. */
  onCardClicked(callback: (info: CardClickedInfo) => void): Unsubscribe;
  onPileTapped(callback: (pile: IPile) => void): Unsubscribe;
  setDragEligibilityPredicate(predicate: DragEligibilityPredicate | null): void;
}
