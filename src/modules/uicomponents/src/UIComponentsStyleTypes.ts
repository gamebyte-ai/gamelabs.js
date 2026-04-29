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

/**
 * Visual style for `RadioButtonComponent`. Two mutually-exclusive
 * indicator slots — `unselected` (resting outer ring) and `selected`
 * (outer ring + inner dot) — plus an optional `label` text style. The
 * indicator is a single `PIXI.Sprite` whose texture swaps when the
 * selected state changes; the inner-dot rendering is baked into the
 * `selected` texture rather than drawn at runtime.
 *
 * Slot defaults (applied for any field omitted in the registered style
 * and the per-button override):
 * - `textureId`: the two PNGs shipped by `UIComponentsBinding`
 *   (`DefaultRadio{Unselected,Selected}`).
 * - `color` / `alpha`: `0xffffff` / `1`. Per-button tinting flows
 *   through `Container.tint`.
 * - `scaleX` / `scaleY`: `1`.
 * - `border`: `0` (radios are circular sprites with anti-aliased edges
 *   — nine-slice would clip the curve, so the indicator always renders
 *   as a plain stretched `PIXI.Sprite`).
 */
export type RadioButtonComponentStyle = {
  unselected?: SpriteStyle;
  selected?: SpriteStyle;
  label?: TextStyle;
};

/**
 * Visual style for `ToggleComponent`. Three slots — `trackOn` /
 * `trackOff` swap on the toggle's value (the track is a single sprite
 * whose texture changes), and `thumb` is a separate sprite that slides
 * between the off and on positions.
 *
 * Slot defaults (applied for any field omitted in the registered style
 * and the per-toggle override):
 * - `textureId`: the three PNGs shipped by `UIComponentsBinding`
 *   (`DefaultToggle{TrackOn,TrackOff,Thumb}`). The default skin uses a
 *   rounded pill track + circular thumb.
 * - `color` / `alpha`: `0xffffff` / `1`. Per-toggle tinting flows
 *   through `Container.tint`.
 * - `scaleX` / `scaleY`: `1`.
 * - `border`: `0` for all three slots — toggles render as plain
 *   stretched sprites at their layout box / thumb diameter, so 9-slice
 *   would distort the curved track ends. Custom skins that ship with a
 *   straight-edged track can opt into nine-slice by setting `border > 0`.
 */
export type ToggleComponentStyle = {
  trackOn?: SpriteStyle;
  trackOff?: SpriteStyle;
  thumb?: SpriteStyle;
};

/**
 * Visual style for `BackgroundComponent`. A single sprite slot — the
 * full-screen `bg` texture cover-scaled to the host's layout box.
 *
 * Slot defaults (applied for any field omitted in the registered style
 * and the per-component override):
 * - `textureId`: the PNG shipped by `UIComponentsBinding`
 *   (`DefaultBackground` — a plain white texture). Apps that render a
 *   real backdrop override this via `styleManager.modify(...)` or per-
 *   call `styleManager.resolve(UIComponentsStyleIds.Background, { bg: { textureId: "..." } })`.
 * - `color` / `alpha`: `0xffffff` / `1`. Per-component tinting flows
 *   through `Container.tint`.
 * - `scaleX` / `scaleY`: `1`. The component does **not** use the
 *   resolved scaleX/scaleY for sprite size (cover-fit math drives that
 *   based on the layout box); the fields stay for `SpriteStyle` shape
 *   compatibility.
 * - `border`: `0`. Backgrounds are full-screen cover-scaled — 9-slice
 *   would distort the texture. The component bypasses the base
 *   `_buildSprite` helper for its own cover-fit positioning, so this
 *   field is informational only.
 *
 * Overlay and fallback colours are not part of the style — they are
 * per-screen UI tuning and live on the `BackgroundComponentOpts`.
 */
export type BackgroundComponentStyle = {
  bg?: SpriteStyle;
};

/**
 * Visual style for `DropdownComponent`. Six sprite slots covering the
 * header / list containers, the three item-row states, and the chevron
 * icon — plus a shared label `TextStyle` used by both the header label
 * and per-item labels.
 *
 * Slot defaults (applied for any field omitted in the registered style
 * and the per-component override):
 * - `textureId`: the six PNGs shipped by `UIComponentsBinding`
 *   (`DefaultDropdown{Header,List,ItemIdle,ItemHover,ItemSelected,Chevron}`).
 *   `header` and `list` use 9-slice (border 6) so the rounded corners
 *   stay crisp at any width; the three item-row variants are flat
 *   stretched sprites; the chevron is a small icon rotated 180° at
 *   runtime when the list opens.
 * - `color` / `alpha`: `0xffffff` / `1`. Per-component tinting flows
 *   through `Container.tint` and applies to every sub-sprite.
 * - `scaleX` / `scaleY`: `1`.
 * - `border`: `6` for `header` + `list` (rounded-corner inset),
 *   `0` for the three item slots and the chevron.
 */
export type DropdownComponentStyle = {
  header?: SpriteStyle;
  list?: SpriteStyle;
  itemIdle?: SpriteStyle;
  itemHover?: SpriteStyle;
  itemSelected?: SpriteStyle;
  chevron?: SpriteStyle;
  label?: TextStyle;
};

/** Style ids registered by the uicomponents module. */
export const UIComponentsStyleIds = {
  Button: "uicomponents.button",
  Slider: "uicomponents.slider",
  RadioButton: "uicomponents.radiobutton",
  Toggle: "uicomponents.toggle",
  Background: "uicomponents.background",
  Dropdown: "uicomponents.dropdown",
} as const;
