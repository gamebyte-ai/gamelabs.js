/**
 * Demo-specific palettes and preset lists. Demos cycle through these
 * via `makeCycleRow` to test their components against a known-good set
 * of inputs.
 */

// ─── ButtonDemo ────────────────────────────────────────────────────────
export const BUTTON_FILL_PALETTE: readonly number[] = [
  0x3b82f6, 0x22c55e, 0xef4444, 0xeab308, 0xa855f7,
];
export const BUTTON_FILL_LABELS: readonly string[] = ["blue", "green", "red", "yellow", "purple"];
export const BUTTON_TEXT_PRESETS: readonly string[] = [
  "Click me",
  "Submit",
  "Cancel",
  "Save",
  "Continue",
];

// ─── SliderDemo ────────────────────────────────────────────────────────
export const SLIDER_FILL_PALETTE: readonly number[] = [
  0x4299e1, 0x22c55e, 0xef4444, 0xeab308, 0xa855f7,
];
export const SLIDER_FILL_LABELS: readonly string[] = ["blue", "green", "red", "yellow", "purple"];

export interface SliderRangePreset {
  readonly min: number;
  readonly max: number;
  readonly label: string;
}

export const SLIDER_RANGE_PRESETS: readonly SliderRangePreset[] = [
  { min: 0, max: 1, label: "0..1" },
  { min: 0, max: 100, label: "0..100" },
  { min: -1, max: 1, label: "-1..1" },
  { min: 0, max: 360, label: "0..360" },
];

// ─── ToggleDemo ────────────────────────────────────────────────────────
export const TOGGLE_ON_PALETTE: readonly number[] = [
  0x48bb78, 0x3b82f6, 0xef4444, 0xeab308, 0xa855f7,
];
export const TOGGLE_ON_LABELS: readonly string[] = ["green", "blue", "red", "yellow", "purple"];

// ─── GridLayoutDemo ────────────────────────────────────────────────────
export type GridAlignItems = "flex-start" | "center" | "flex-end" | "stretch";
export type GridJustifyContent =
  | "flex-start"
  | "center"
  | "flex-end"
  | "space-between"
  | "space-around"
  | "space-evenly";
export type GridFlexWrap = "wrap" | "nowrap" | "wrap-reverse";

/** Rotating palette used to color the demo's child squares. */
export const GRID_ITEM_PALETTE: readonly number[] = [
  0xef4444, 0xf97316, 0xeab308, 0x22c55e, 0x14b8a6, 0x3b82f6, 0x8b5cf6, 0xec4899,
];

export const GRID_ALIGN_ITEMS: readonly GridAlignItems[] = [
  "flex-start",
  "center",
  "flex-end",
  "stretch",
];

export const GRID_JUSTIFY_CONTENT: readonly GridJustifyContent[] = [
  "flex-start",
  "center",
  "flex-end",
  "space-between",
  "space-around",
  "space-evenly",
];

export const GRID_FLEX_WRAP: readonly GridFlexWrap[] = ["wrap", "nowrap", "wrap-reverse"];

/**
 * Per-item height pattern. Used by the demo to make `alignItems` visibly
 * do something — when every item is the same height each row collapses
 * to that height and cross-axis alignment has no spare room to apply.
 */
export type GridItemHeightMode = "uniform" | "alternating" | "ascending" | "random";

export const GRID_ITEM_HEIGHT_MODES: readonly GridItemHeightMode[] = [
  "uniform",
  "alternating",
  "ascending",
  "random",
];

export const GRID_ITEM_HEIGHT_MODE_LABELS: Readonly<Record<GridItemHeightMode, string>> = {
  uniform: "Uniform",
  alternating: "Alternating",
  ascending: "Ascending",
  random: "Random",
};

// ─── DropdownDemo ──────────────────────────────────────────────────────

export interface DropdownItemPreset {
  readonly id: string;
  readonly label: string;
}

/**
 * Pool of items the demo cycles between via the `itemCount` control.
 * The controller slices the first N entries based on the selected
 * count so a single library backs every variant.
 */
export const DROPDOWN_ITEM_LIBRARY: readonly DropdownItemPreset[] = [
  { id: "easy", label: "Easy" },
  { id: "normal", label: "Normal" },
  { id: "hard", label: "Hard" },
  { id: "insane", label: "Insane" },
  { id: "custom", label: "Custom" },
  { id: "tutorial", label: "Tutorial" },
  { id: "story", label: "Story" },
  { id: "sandbox", label: "Sandbox" },
];

export const DROPDOWN_ITEM_COUNTS: readonly number[] = [3, 5, 8];

export const DROPDOWN_PLACEHOLDERS: readonly string[] = [
  "Select…",
  "Choose difficulty",
  "Pick one",
];

// ─── RadioButtonDemo ───────────────────────────────────────────────────

export const RADIO_SELECTED_PALETTE: readonly number[] = [
  0x4338ca, 0x22c55e, 0xef4444, 0xeab308, 0xa855f7,
];

export const RADIO_SELECTED_LABELS: readonly string[] = [
  "indigo",
  "green",
  "red",
  "yellow",
  "purple",
];

export const RADIO_LABEL_PRESETS: readonly string[] = [
  "Option A",
  "Easy mode",
  "Subscribe to updates",
  "Enable notifications",
];
