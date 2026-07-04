import type { ControlAnchor } from "../constants/ControlAnchor.js";
import type { SafeAreaInsets } from "../../../../core/utilities/safeAreaInsets.js";

/**
 * Compute pixel position from anchor + offset given screen dimensions.
 * Edge-anchored axes shift inward by the matching safe-area inset so controls
 * clear the notch and home indicator; center axes ignore insets.
 */
export function resolveAnchorPosition(
  anchor: ControlAnchor,
  offsetX: number,
  offsetY: number,
  screenWidth: number,
  screenHeight: number,
  insets?: SafeAreaInsets,
): { x: number; y: number } {
  let x: number;
  let y: number;

  const a = anchor as string;
  if (a.includes("left")) x = (insets?.left ?? 0) + offsetX;
  else if (a.includes("right")) x = screenWidth - (insets?.right ?? 0) - offsetX;
  else x = screenWidth / 2 + offsetX;

  if (a.startsWith("top")) y = (insets?.top ?? 0) + offsetY;
  else if (a.startsWith("bottom")) y = screenHeight - (insets?.bottom ?? 0) - offsetY;
  else y = screenHeight / 2 + offsetY;

  return { x, y };
}
