import type { IView, Unsubscribe } from "@gamebyte/gamelabsjs";
import type { IBoardModel } from "../models/IBoardModel";
import type { IPile } from "../models/IPile";

export interface CardsDragReleaseInfo {
  readonly originPile: IPile;
  readonly fromIndex: number;
  readonly targetPile: IPile | null;
}

export type DragEligibilityPredicate = (pile: IPile, fromIndex: number) => boolean;

export interface IBoardView extends IView {
  bindBoard(model: IBoardModel): void;
  refresh(): void;
  /** Animate the dragged stack from its release position to its
   *  destination in the current model state, then rebuild. The
   *  controller calls this in response to drag-release (snap-back or
   *  successful move) instead of {@link refresh}, so the cards do
   *  not snap instantly. */
  commitDragRelease(): void;
  onCardsDragReleased(callback: (info: CardsDragReleaseInfo) => void): Unsubscribe;
  onPileTapped(callback: (pile: IPile) => void): Unsubscribe;
  setDragEligibilityPredicate(predicate: DragEligibilityPredicate | null): void;
}
