/**
 * Visual descriptor for a single sprite slot. All fields optional;
 * implementers (typically {@link StyledHudObject} subclasses) supply
 * slot-aware defaults for missing fields at construction time.
 *
 * `scaleX` / `scaleY` are proportional to the host slot's reference
 * dimension — a value of `1` fills the slot, `0.5` paints at half its
 * size. Splitting into per-axis lets non-square overrides work
 * (stretched icons, wide bgs) without dropping to per-control geometry.
 *
 * `border`, when greater than zero, opts into nine-slice rendering
 * with a symmetric inset (in source-texture pixels). `StyledHudObject`
 * builds a `PIXI.NineSliceSprite` and the four corners stay at this
 * size while the middle stretches with `width` / `height`. Defaults
 * to `0`, which keeps the slot rendering as a plain stretched
 * `PIXI.Sprite` (current behaviour for all on-screen controls).
 *
 * Resolvers return `Required<SpriteStyle>` once defaults are applied.
 */
export type SpriteStyle = {
  textureId?: string;
  color?: number;
  alpha?: number;
  scaleX?: number;
  scaleY?: number;
  border?: number;
};
