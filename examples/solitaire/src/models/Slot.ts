import type { SlotConfig } from "./SlotConfig";
import type { Card, ICard } from "./Card";

export interface ISlot {
  readonly config: SlotConfig;
  readonly cards: readonly ICard[];
  readonly topCard: ICard | null;
}

export class Slot implements ISlot {
  public readonly config: SlotConfig;
  private readonly _cards: Card[] = [];

  public constructor(config: SlotConfig) {
    this.config = config;
  }

  public get cards(): readonly Card[] {
    return this._cards;
  }

  public get topCard(): Card | null {
    return this._cards.length > 0 ? this._cards[this._cards.length - 1] : null;
  }

  public pushCard(card: Card): void {
    this._cards.push(card);
  }

  public popCard(): Card | null {
    return this._cards.pop() ?? null;
  }

  public clear(): void {
    this._cards.length = 0;
  }
}
