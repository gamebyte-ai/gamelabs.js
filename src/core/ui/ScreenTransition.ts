/**
 * Transition parameters for screen navigation.
 */
export const SCREEN_TRANSITION_TYPES = {
  INSTANT: "instant",
  FADE_IN: "fade_in",
  SLIDE_IN_LEFT: "slide_in_left",
  SLIDE_IN_RIGHT: "slide_in_right",
  SLIDE_IN_DOWN: "slide_in_down",
  SLIDE_IN_UP: "slide_in_up"
} as const;

export type ScreenTransitionType = (typeof SCREEN_TRANSITION_TYPES)[keyof typeof SCREEN_TRANSITION_TYPES];

export type ScreenTransition = {
  type: ScreenTransitionType;
  durationMs: number;
};
