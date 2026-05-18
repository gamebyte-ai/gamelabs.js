export enum Suit {
  Clubs = "Clubs",
  Diamonds = "Diamonds",
  Hearts = "Hearts",
  Spades = "Spades",
}

export function isRedSuit(suit: Suit): boolean {
  return suit === Suit.Diamonds || suit === Suit.Hearts;
}

export const SUIT_SYMBOL: Readonly<Record<Suit, string>> = {
  [Suit.Clubs]: "♣",
  [Suit.Diamonds]: "♦",
  [Suit.Hearts]: "♥",
  [Suit.Spades]: "♠",
};
