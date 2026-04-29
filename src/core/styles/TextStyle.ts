/**
 * Visual descriptor for a text node. All fields optional;
 * implementers (typically {@link StyledHudObject} subclasses) supply
 * font-family / size / weight / color / alpha defaults at construction.
 *
 * `color` is the fill colour as a hex number (e.g. `0xffffff`). Stroke
 * and shadow are intentionally not exposed here yet — add when a real
 * use case lands.
 */
export type TextStyle = {
  fontFamily?: string;
  fontSize?: number;
  /** CSS font-weight string: `"normal"`, `"bold"`, or `"100"`–`"900"`. */
  fontWeight?: string;
  color?: number;
  alpha?: number;
};
