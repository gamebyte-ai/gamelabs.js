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
  onCardsDragReleased(callback: (info: CardsDragReleaseInfo) => void): Unsubscribe;
  onPileTapped(callback: (pile: IPile) => void): Unsubscribe;
  setDragEligibilityPredicate(predicate: DragEligibilityPredicate | null): void;
}
