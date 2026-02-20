/**
 * Transition parameters for screen navigation.
 */
export const SCREEN_TRANSITION_TYPES = {
  INSTANT: "instant",
  FADE_IN: "fade_in"
} as const;

export type ScreenTransition = {
  type: string;
  durationMs: number;
};
