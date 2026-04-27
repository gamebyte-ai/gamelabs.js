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
