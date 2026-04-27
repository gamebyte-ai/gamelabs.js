/**
 * Sidebar grouping for a registered demo.
 */
export type DemoCategory = "Component" | "Composition";

/**
 * Order in which sidebar sections are rendered.
 */
export const SIDEBAR_CATEGORY_ORDER: readonly DemoCategory[] = ["Component", "Composition"];

/**
 * One entry in the demo registry — also the shape the shell view uses
 * to render the sidebar.
 */
export interface DemoEntry {
  readonly id: string;
  readonly label: string;
  readonly category: DemoCategory;
}

/**
 * Slider control parameters used by `IControlsManager.addSliderControl`.
 * Pure data — no methods, no class behaviour.
 */
export interface SliderControlOpts {
  readonly min: number;
  readonly max: number;
  readonly step?: number;
  readonly value: number;
  /** Optional formatter for the live readout next to the slider. */
  readonly format?: (v: number) => string;
}
