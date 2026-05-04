import { BubbleColor } from "./constants/BubbleColor";

export enum BubbleShooterAssetIds {
  BubbleRed = "BubbleShooter.BubbleRed",
  BubbleBlue = "BubbleShooter.BubbleBlue",
  BubbleGreen = "BubbleShooter.BubbleGreen",
  BubbleYellow = "BubbleShooter.BubbleYellow",
  BubblePurple = "BubbleShooter.BubblePurple",
  /** Refresh-style icon framing the next-bubble preview (swap affordance). */
  SwapIcon = "BubbleShooter.SwapIcon",
  /** Bomb sprite for the world (held / flying bomb visual). */
  BombBubble = "BubbleShooter.BombBubble",
  /** Bomb sprite for the HUD button icon (same artwork, HUD texture type). */
  BombIcon = "BubbleShooter.BombIcon",
  /** Fireball sprite for the world (held / flying fireball visual). */
  FireballBubble = "BubbleShooter.FireballBubble",
  /** Fireball sprite for the HUD button icon. */
  FireballIcon = "BubbleShooter.FireballIcon",
}

export const BUBBLE_COLOR_TO_ASSET_ID: Readonly<Record<BubbleColor, BubbleShooterAssetIds>> = {
  [BubbleColor.Red]: BubbleShooterAssetIds.BubbleRed,
  [BubbleColor.Blue]: BubbleShooterAssetIds.BubbleBlue,
  [BubbleColor.Green]: BubbleShooterAssetIds.BubbleGreen,
  [BubbleColor.Yellow]: BubbleShooterAssetIds.BubbleYellow,
  [BubbleColor.Purple]: BubbleShooterAssetIds.BubblePurple,
};
