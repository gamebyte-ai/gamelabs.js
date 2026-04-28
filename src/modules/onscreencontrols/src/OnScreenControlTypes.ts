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
 * Visual descriptor shared by every textured slot in a virtual control
 * (button up/down/disabled, button icon, joystick base, joystick knob).
 *
 * All fields are optional; the view layer resolves omitted values from
 * slot-aware defaults:
 * - `textureId`: framework default for the slot
 *   (`OnScreenControlsAssetIds.ButtonBg` for button up/down/disabled,
 *   `JoystickBase` for joystick base, `JoystickHandle` for joystick
 *   knob). The button icon has no default — apps that want an icon
 *   must supply `textureId`.
 * - `color`: per-slot default tint (slightly grey for buttons, no
 *   tint for joysticks). Use `0xFFFFFF` to render the texture as-is.
 * - `alpha`: per-slot default opacity (button states: 0.5 / 0.8 / 0.55;
 *   joystick base: 0.85; joystick knob: 0.95).
 * - `scale`: fraction of the host slot size; `1` fills, `0.5` is half.
 *   Defaults to `1` everywhere except button icon (`0.6`).
 */
export type OscVisual = {
  textureId?: string;
  color?: number;
  alpha?: number;
  scale?: number;
};

/**
 * Virtual button configuration.
 *
 * The bg renders three visuals: `up` while resting, `down` while
 * pressed, and `disabled` once `OnScreenControlManager.setButtonEnabled`
 * is called with `false`. Each is an independent `OscVisual` so apps
 * can swap textures, colours, alpha, or scale per state. The optional
 * `icon` is rendered above the bg.
 */
export type VirtualButtonConfig = VirtualControlConfig & {
  type: ControlType.Button;
  size: number;
  /** Resting visual. Defaults: ButtonBg, color 0x222222, alpha 0.5, scale 1. */
  up?: OscVisual;
  /** Pressed visual. Defaults: ButtonBg, color 0x444444, alpha 0.8, scale 1. */
  down?: OscVisual;
  /** Disabled visual. Defaults: ButtonBg, color 0x4a5a4a, alpha 0.55, scale 1. */
  disabled?: OscVisual;
  /**
   * Optional icon overlay drawn above the bg. `textureId` must be set
   * for the icon to render. Default scale is `0.6` of the button size.
   */
  icon?: OscVisual;
  /**
   * Optional progress ring drawn around the button. Defaults: ButtonProgress
   * texture, color 0xFFFFFF, alpha 0.85, scale 1.1 (10% larger than the
   * button so the ring sits just outside the bg). The ring is hidden
   * by default; the runtime `OnScreenControlManager.showButtonProgress`
   * / `setButtonProgress` / `hideButtonProgress` API drives visibility
   * and the wedge sweep (clockwise from 12 o'clock).
   */
  progress?: OscVisual;
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
  /** Base ring visual. Defaults: JoystickBase, color 0xFFFFFF, alpha 0.85, scale 1. */
  base?: OscVisual;
  /** Knob disk visual. Defaults: JoystickHandle, color 0xFFFFFF, alpha 0.95, scale 1. */
  knob?: OscVisual;
};

export type ControlConfig = VirtualButtonConfig | VirtualJoystickConfig;
