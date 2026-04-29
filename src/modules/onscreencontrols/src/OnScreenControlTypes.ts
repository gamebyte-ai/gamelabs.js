export { ControlAnchor } from "./constants/ControlAnchor.js";
export { ControlType } from "./constants/ControlType.js";
export { resolveAnchorPosition } from "./utilities/resolveAnchorPosition.js";

import type { ControlType } from "./constants/ControlType.js";
import type { ControlAnchor } from "./constants/ControlAnchor.js";
import type { SpriteStyle } from "../../../core/styles/SpriteStyle.js";

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
 *
 * The bg renders three visuals: `up` while resting, `down` while
 * pressed, and `disabled` once `OnScreenControlManager.setControlEnabled`
 * is called with `false`. Each is an independent {@link SpriteStyle}
 * so apps can swap textures, colours, alpha, or per-axis scale per
 * state. The optional `icon` is rendered above the bg.
 *
 * Slot defaults (applied for any field omitted in the registered
 * style and the per-control override):
 * - `textureId`: framework default per slot (`ButtonBg` for bg states,
 *   `ButtonProgress` for the progress ring; the icon has no default —
 *   apps must supply `textureId` to render an icon).
 * - `color` / `alpha`: per-slot tint and opacity baked into the
 *   registered `osc.button` style entry.
 * - `scaleX` / `scaleY`: proportional to the button's `size`.
 *   `1` fills, `0.6` for the icon, `1.1` for the progress ring.
 */
export type VirtualButtonConfig = VirtualControlConfig & {
  type: ControlType.Button;
  size: number;
  /** Resting visual. Defaults: ButtonBg, color 0x222222, alpha 0.5, scaleX/Y 1. */
  up?: SpriteStyle;
  /** Pressed visual. Defaults: ButtonBg, color 0x444444, alpha 0.8, scaleX/Y 1. */
  down?: SpriteStyle;
  /** Disabled visual. Defaults: ButtonBg, color 0x4a5a4a, alpha 0.55, scaleX/Y 1. */
  disabled?: SpriteStyle;
  /**
   * Optional icon overlay drawn above the bg. `textureId` must be set
   * for the icon to render. Default scaleX/Y is `0.6` of the button size.
   */
  icon?: SpriteStyle;
  /**
   * Optional progress ring drawn around the button. Defaults: ButtonProgress
   * texture, color 0xFFFFFF, alpha 0.85, scaleX/Y 1.1 (10% larger than the
   * button so the ring sits just outside the bg). The ring is hidden
   * by default; the runtime `OnScreenControlManager.showButtonProgress`
   * / `setButtonProgress` / `hideButtonProgress` API drives visibility
   * and the wedge sweep (clockwise from 12 o'clock).
   */
  progress?: SpriteStyle;
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
  /**
   * Knob distance (`0..1`) at which the digital virtual keys
   * (`<id>.up/down/left/right`) start firing. Has no effect on the
   * analog `<id>.x` / `<id>.y` ranges — those always carry the raw
   * normalized value.
   * @default 0.3
   */
  threshold?: number;
  /** Base ring visual. Defaults: JoystickBase, color 0xFFFFFF, alpha 0.85, scaleX/Y 1. */
  base?: SpriteStyle;
  /** Knob disk visual. Defaults: JoystickHandle, color 0xFFFFFF, alpha 0.95, scaleX/Y 1. */
  knob?: SpriteStyle;
};

export type ControlConfig = VirtualButtonConfig | VirtualJoystickConfig;

/**
 * Visual fields of {@link VirtualButtonConfig} that the framework
 * registers as a default `StyleManager` entry under
 * {@link OscStyleIds.Button}. Apps can `modify` this entry to retheme
 * every on-screen button at once, or pass per-control overrides via
 * the matching fields on `addControl`.
 */
export type OscButtonStyle = {
  up?: SpriteStyle;
  down?: SpriteStyle;
  disabled?: SpriteStyle;
  icon?: SpriteStyle;
  progress?: SpriteStyle;
};

/**
 * Visual fields of {@link VirtualJoystickConfig} that the framework
 * registers as a default `StyleManager` entry under
 * {@link OscStyleIds.Joystick}. Apps `modify` this entry to retheme
 * every on-screen joystick at once, or pass per-control overrides
 * via the matching fields on `addControl`.
 */
export type OscJoystickStyle = {
  base?: SpriteStyle;
  knob?: SpriteStyle;
};

/** Style ids registered by the on-screen controls module. */
export const OscStyleIds = {
  Button: "osc.button",
  Joystick: "osc.joystick",
} as const;
