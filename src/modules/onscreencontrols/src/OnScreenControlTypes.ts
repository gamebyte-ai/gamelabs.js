export { ControlAnchor } from "./constants/ControlAnchor.js";
export { ControlType } from "./constants/ControlType.js";
export { resolveAnchorPosition } from "./utilities/resolveAnchorPosition.js";

import type { ControlType } from "./constants/ControlType.js";
import type { ControlAnchor } from "./constants/ControlAnchor.js";

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
  /** Threshold (0-1) for the knob distance to trigger a virtual key. @default 0.3 */
  threshold?: number;
  baseColor?: number;
  baseAlpha?: number;
  knobColor?: number;
  knobAlpha?: number;
};

export type ControlConfig = VirtualButtonConfig | VirtualJoystickConfig;
