import type { LayoutOptions } from "@pixi/layout";
import * as PIXI from "pixi.js";

export type GridLayoutComponentPreset = {
  /** X position. */
  x?: number;
  /** Y position. */
  y?: number;
  /** Fixed width. Accepts a number or a percentage string like "100%". */
  width?: LayoutOptions["width"];
  /** Fixed height. Accepts a number or a percentage string like "100%". */
  height?: LayoutOptions["height"];
  /**
   * Gap between children on both axes. Overridden per-axis by
   * {@link rowGap} / {@link columnGap}. @default 0
   */
  gap?: number;
  /** Vertical gap between rows. Falls back to {@link gap} when omitted. */
  rowGap?: number;
  /** Horizontal gap between columns. Falls back to {@link gap} when omitted. */
  columnGap?: number;
  /** Padding on all sides. @default 0 */
  padding?: number;
  /** Cross-axis alignment of items within a row. @default "center" */
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch";
  /**
   * Distribution of whole rows along the cross axis when there's spare
   * vertical space. @default "flex-start"
   */
  alignContent?: "flex-start" | "center" | "flex-end" | "stretch" | "space-between" | "space-around";
  /** Main-axis (horizontal) distribution within each row. @default "flex-start" */
  justifyContent?: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
  /**
   * Wrapping behaviour. The grid wraps by default — that's what makes
   * it act as a grid (rows form when children exceed the container's
   * main-axis size). @default "wrap"
   */
  flexWrap?: "wrap" | "nowrap" | "wrap-reverse";
};

/**
 * Parse a JSON string into GridLayoutComponentPreset.
 */
export function parseGridLayoutComponentPreset(json: string): GridLayoutComponentPreset {
  return JSON.parse(json) as GridLayoutComponentPreset;
}

/**
 * Reusable grid layout container.
 *
 * Yoga doesn't implement CSS Grid; this component approximates a grid
 * via `flexDirection: "row"` + `flexWrap: "wrap"`. Children with
 * explicit dimensions wrap to a new row when the cumulative main-axis
 * size exceeds the container width, producing N×M grids without
 * runtime column-count maths.
 *
 * Use symmetric {@link GridLayoutComponentPreset.gap} for tidy grids;
 * fall back to {@link GridLayoutComponentPreset.rowGap} +
 * {@link GridLayoutComponentPreset.columnGap} when rows and columns
 * need different spacing.
 */
export class GridLayoutComponent extends PIXI.Container {
  public constructor(opts: GridLayoutComponentPreset = {}) {
    super();

    if (opts.x !== undefined) this.x = opts.x;
    if (opts.y !== undefined) this.y = opts.y;

    const layout: Omit<LayoutOptions, "target"> = {
      flexDirection: "row",
      flexWrap: opts.flexWrap ?? "wrap",
      gap: opts.gap ?? 0,
      padding: opts.padding ?? 0,
      alignItems: opts.alignItems ?? "center",
      alignContent: opts.alignContent ?? "flex-start",
      justifyContent: opts.justifyContent ?? "flex-start",
    };
    if (opts.width !== undefined) layout.width = opts.width;
    if (opts.height !== undefined) layout.height = opts.height;
    if (opts.rowGap !== undefined) layout.rowGap = opts.rowGap;
    if (opts.columnGap !== undefined) layout.columnGap = opts.columnGap;
    this.layout = layout;
  }
}
