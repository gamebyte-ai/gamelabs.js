export enum BubbleColor {
  Red = 0,
  Blue = 1,
  Green = 2,
  Yellow = 3,
  Purple = 4,
}

export const BUBBLE_COLOR_HEX: Readonly<Record<BubbleColor, number>> = {
  [BubbleColor.Red]: 0xe74c3c,
  [BubbleColor.Blue]: 0x3aa6f0,
  [BubbleColor.Green]: 0x2ecc71,
  [BubbleColor.Yellow]: 0xf1c40f,
  [BubbleColor.Purple]: 0xa569d4,
};

export const BUBBLE_COLORS: readonly BubbleColor[] = [
  BubbleColor.Red,
  BubbleColor.Blue,
  BubbleColor.Green,
  BubbleColor.Yellow,
  BubbleColor.Purple,
];
