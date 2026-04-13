import type { LayoutOptions } from "@pixi/layout";
import * as PIXI from "pixi.js";

export type VerticalLayoutComponentPreset = {
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
  /** Main-axis (vertical) distribution. @default "flex-start" */
  justifyContent?: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
};

/**
 * Parse a JSON string into VerticalLayoutComponentPreset.
 */
export function parseVerticalLayoutComponentPreset(json: string): VerticalLayoutComponentPreset {
  return JSON.parse(json) as VerticalLayoutComponentPreset;
}

/**
 * Reusable vertical layout container.
 *
 * Thin wrapper over a `PIXI.Container` with `flexDirection: "column"` and
 * common flex options (gap, padding, alignItems, justifyContent) preconfigured.
 */
export class VerticalLayoutComponent extends PIXI.Container {
  public constructor(opts: VerticalLayoutComponentPreset = {}) {
    super();

    if (opts.x !== undefined) this.x = opts.x;
    if (opts.y !== undefined) this.y = opts.y;

    const layout: Omit<LayoutOptions, "target"> = {
      flexDirection: "column",
      gap: opts.gap ?? 0,
      padding: opts.padding ?? 0,
      alignItems: opts.alignItems ?? "center",
      justifyContent: opts.justifyContent ?? "flex-start",
    };
    if (opts.width !== undefined) layout.width = opts.width;
    if (opts.height !== undefined) layout.height = opts.height;
    this.layout = layout;
  }
}
