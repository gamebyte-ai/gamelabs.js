/**
 * Screen anchor point for positioning controls.
 */
export enum ControlAnchor {
  TopLeft       = "top-left",
  TopCenter     = "top-center",
  TopRight      = "top-right",
  CenterLeft    = "center-left",
  Center        = "center",
  CenterRight   = "center-right",
  BottomLeft    = "bottom-left",
  BottomCenter  = "bottom-center",
  BottomRight   = "bottom-right",
}

/**
 * Control type discriminator.
 */
export enum ControlType {
  Button   = "button",
  Joystick = "joystick",
}

/**
 * Base configuration shared by all virtual controls.
 */
export type VirtualControlConfig = {
  type: ControlType;
  id: string;
  anchor: ControlAnchor;
  offsetX: number;
  offsetY: number;
};

/**
 * Virtual button configuration.
 */
export type VirtualButtonConfig = VirtualControlConfig & {
  type: ControlType.Button;
  size: number;
  iconTextureId?: string;
  upColor?: number;
  downColor?: number;
  upAlpha?: number;
  downAlpha?: number;
};

/**
 * Virtual joystick configuration.
 */
export type VirtualJoystickConfig = VirtualControlConfig & {
  type: ControlType.Joystick;
  /** Radius of the joystick base. */
  baseSize: number;
  /** Radius of the movable knob. */
  knobSize: number;
  /** If true, joystick appears at touch point within its area. */
  dynamic: boolean;
  /** Width of the dynamic touch area (centered on anchor+offset). Only used when dynamic=true. */
  dynamicAreaWidth?: number;
  /** Height of the dynamic touch area. Only used when dynamic=true. */
  dynamicAreaHeight?: number;
  /** Threshold (0–1) for the knob distance to trigger a virtual key. @default 0.3 */
  threshold?: number;
  baseColor?: number;
  baseAlpha?: number;
  knobColor?: number;
  knobAlpha?: number;
};

export type ControlConfig = VirtualButtonConfig | VirtualJoystickConfig;

/**
 * Compute pixel position from anchor + offset given screen dimensions.
 */
export function resolveAnchorPosition(
  anchor: ControlAnchor,
  offsetX: number,
  offsetY: number,
  screenWidth: number,
  screenHeight: number
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
