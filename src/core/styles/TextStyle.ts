/**
 * Visual descriptor for a text node. All fields optional;
 * `StyledHudObject` patches a `PIXI.Text` with whatever fields are
 * set, leaving Pixi's built-in defaults (`Arial`, `26px`, `0x000000`,
 * `alpha 1`) in place for the rest.
 *
 * `color` is the fill colour as a hex number (e.g. `0xffffff`). Stroke
 * and shadow are intentionally not exposed here yet — add when a real
 * use case lands.
 *
 * `letterSpacing` is in pixels; positive values widen tracking, negative
 * tighten. Used by display labels that need extra tracking (e.g. all-
 * caps menu buttons).
 */
export type TextStyle = {
  fontFamily?: string;
  fontSize?: number;
  /** CSS font-weight string: `"normal"`, `"bold"`, or `"100"`–`"900"`. */
  fontWeight?: string;
  color?: number;
  alpha?: number;
  letterSpacing?: number;
};
