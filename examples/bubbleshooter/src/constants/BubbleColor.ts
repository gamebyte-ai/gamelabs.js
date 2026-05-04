export enum BubbleColor {
  Red = 0,
  Blue = 1,
  Green = 2,
  Yellow = 3,
  Purple = 4,
  /**
   * Special "stone" cell — immune to colour matches, bombs, and
   * fireballs. Stones still fall when disconnected and pop on the
   * fall threshold (without awarding points).
   */
  Stone = 5,
}

export const BUBBLE_COLOR_HEX: Readonly<Record<BubbleColor, number>> = {
  [BubbleColor.Red]: 0xe74c3c,
  [BubbleColor.Blue]: 0x3aa6f0,
  [BubbleColor.Green]: 0x2ecc71,
  [BubbleColor.Yellow]: 0xf1c40f,
  [BubbleColor.Purple]: 0xa569d4,
  [BubbleColor.Stone]: 0x8c8a82,
};

/** Playable colour palette — does NOT include Stone. */
export const BUBBLE_COLORS: readonly BubbleColor[] = [
  BubbleColor.Red,
  BubbleColor.Blue,
  BubbleColor.Green,
  BubbleColor.Yellow,
  BubbleColor.Purple,
];

/** Every cell type the view needs a texture / material for, including Stone. */
export const ALL_BUBBLE_COLORS: readonly BubbleColor[] = [...BUBBLE_COLORS, BubbleColor.Stone];
