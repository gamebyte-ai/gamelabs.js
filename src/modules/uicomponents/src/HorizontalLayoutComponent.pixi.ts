import type { LayoutOptions } from "@pixi/layout";
import * as PIXI from "pixi.js";

export type HorizontalLayoutComponentPreset = {
  /** X position. */
  x?: number;
  /** Y position. */
  y?: number;
  /** Fixed width. Accepts a number or a percentage string like "100%". */
  width?: LayoutOptions["width"];
  /** Fixed height. Accepts a number or a percentage string like "100%". */
  height?: LayoutOptions["height"];
  /** Gap between children. @default 0 */
  gap?: number;
  /** Padding on all sides. @default 0 */
  padding?: number;
  /** Cross-axis alignment. @default "center" */
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch";
  /** Main-axis (horizontal) distribution. @default "flex-start" */
  justifyContent?: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
  /** Positioning mode. @default undefined (flex flow) */
  position?: "absolute" | "relative";
  /** Absolute offset from left. */
  left?: number;
  /** Absolute offset from top. */
  top?: number;
  /** Absolute offset from right. */
  right?: number;
  /** Absolute offset from bottom. */
  bottom?: number;
};

/**
 * Parse a JSON string into HorizontalLayoutComponentPreset.
 */
export function parseHorizontalLayoutComponentPreset(json: string): HorizontalLayoutComponentPreset {
  return JSON.parse(json) as HorizontalLayoutComponentPreset;
}

/**
 * Reusable horizontal layout container.
 *
 * Thin wrapper over a `PIXI.Container` with `flexDirection: "row"` and
 * common flex options (gap, padding, alignItems, justifyContent) preconfigured.
 * Supports absolute positioning for use as a top/bottom bar or overlay.
 */
export class HorizontalLayoutComponent extends PIXI.Container {
  constructor(opts: HorizontalLayoutComponentPreset = {}) {
    super();

    if (opts.x !== undefined) this.x = opts.x;
    if (opts.y !== undefined) this.y = opts.y;

    const layout: Omit<LayoutOptions, "target"> = {
      flexDirection: "row",
      gap: opts.gap ?? 0,
      padding: opts.padding ?? 0,
      alignItems: opts.alignItems ?? "center",
      justifyContent: opts.justifyContent ?? "flex-start",
    };
    if (opts.width !== undefined) layout.width = opts.width;
    if (opts.height !== undefined) layout.height = opts.height;
    if (opts.position !== undefined) layout.position = opts.position;
    if (opts.left !== undefined) layout.left = opts.left;
    if (opts.top !== undefined) layout.top = opts.top;
    if (opts.right !== undefined) layout.right = opts.right;
    if (opts.bottom !== undefined) layout.bottom = opts.bottom;
    this.layout = layout;
  }
}
