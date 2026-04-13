import type { ControlAnchor } from "../constants/ControlAnchor.js";

/**
 * Compute pixel position from anchor + offset given screen dimensions.
 */
export function resolveAnchorPosition(
  anchor: ControlAnchor,
  offsetX: number,
  offsetY: number,
  screenWidth: number,
  screenHeight: number,
): { x: number; y: number } {
  let x: number;
  let y: number;

  const a = anchor as string;
  if (a.includes("left")) x = offsetX;
  else if (a.includes("right")) x = screenWidth - offsetX;
  else x = screenWidth / 2 + offsetX;

  if (a.startsWith("top")) y = offsetY;
  else if (a.startsWith("bottom")) y = screenHeight - offsetY;
  else y = screenHeight / 2 + offsetY;

  return { x, y };
}
