import type { SpriteStyle } from "../../../core/styles/SpriteStyle.js";
import type { TextStyle } from "../../../core/styles/TextStyle.js";

/**
 * Visual style for `ButtonComponent`. Bundles four mutually-exclusive
 * pointer-state slots (`idle`, `hover`, `pressed`, `disabled`) plus an
 * optional `label` text style. Each slot is an independent `SpriteStyle`
 * so apps can swap textures, colours, alpha, per-axis scale, or
 * nine-slice border per state.
 *
 * Apps `modify` this entry on `StyleManager` to retheme every button at
 * once; per-button overrides via the corresponding component preset
 * fields deep-merge on top.
 *
 * Slot defaults (applied for any field omitted in the registered style
 * and the per-button override):
 * - `textureId`: framework default per slot — the four PNGs shipped by
 *   `UIComponentsBinding` (`DefaultButton{Idle,Hover,Pressed,Disabled}`).
 * - `color` / `alpha`: `0xffffff` / `1` so default-skin renders without
 *   tinting; consumers tint per-button via the component's `tint` if
 *   they need colour identity.
 * - `scaleX` / `scaleY`: `1` (slot fills its layout box).
 * - `border`: `2` for the bg slots — the default skin's PNGs ship with
 *   a 2px black border so 9-slice keeps it crisp at any size.
 */
export type ButtonComponentStyle = {
  idle?: SpriteStyle;
  hover?: SpriteStyle;
  pressed?: SpriteStyle;
  disabled?: SpriteStyle;
  label?: TextStyle;
};

/**
 * Visual style for `SliderComponent`. Three slots — `track` (full-length
 * background), `fill` (value-driven foreground), `thumb` (draggable
 * handle). Track + fill use nine-slice rendering when their `border`
 * is positive so the borders stay crisp as the slider stretches; the
 * thumb is always a plain stretched sprite at `thumbRadius * 2` square.
 *
 * Slot defaults (applied for any field omitted in the registered style
 * and the per-slider override):
 * - `textureId`: framework default per slot — the three PNGs shipped by
 *   `UIComponentsBinding` (`DefaultSlider{Track,Fill,Thumb}`).
 * - `color` / `alpha`: `0xffffff` / `1`. Per-channel tinting (e.g. R/G/B
 *   sliders sharing one neutral skin) flows through `Container.tint` on
 *   the component itself, propagating to all three sub-sprites.
 * - `scaleX` / `scaleY`: `1`.
 * - `border`: `2` for `track` and `fill`, `0` for `thumb`.
 */
export type SliderComponentStyle = {
  track?: SpriteStyle;
  fill?: SpriteStyle;
  thumb?: SpriteStyle;
};

/** Style ids registered by the uicomponents module. */
export const UIComponentsStyleIds = {
  Button: "uicomponents.button",
  Slider: "uicomponents.slider",
} as const;
