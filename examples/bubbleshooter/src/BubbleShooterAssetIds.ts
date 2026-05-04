import { BubbleColor } from "./constants/BubbleColor";

export enum BubbleShooterAssetIds {
  BubbleRed = "BubbleShooter.BubbleRed",
  BubbleBlue = "BubbleShooter.BubbleBlue",
  BubbleGreen = "BubbleShooter.BubbleGreen",
  BubbleYellow = "BubbleShooter.BubbleYellow",
  BubblePurple = "BubbleShooter.BubblePurple",
  /** Refresh-style icon framing the next-bubble preview (swap affordance). */
  SwapIcon = "BubbleShooter.SwapIcon",
}

export const BUBBLE_COLOR_TO_ASSET_ID: Readonly<Record<BubbleColor, BubbleShooterAssetIds>> = {
  [BubbleColor.Red]: BubbleShooterAssetIds.BubbleRed,
  [BubbleColor.Blue]: BubbleShooterAssetIds.BubbleBlue,
  [BubbleColor.Green]: BubbleShooterAssetIds.BubbleGreen,
  [BubbleColor.Yellow]: BubbleShooterAssetIds.BubbleYellow,
  [BubbleColor.Purple]: BubbleShooterAssetIds.BubblePurple,
};
