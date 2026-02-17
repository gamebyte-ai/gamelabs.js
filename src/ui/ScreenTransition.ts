/**
 * Transition parameters for screen navigation.
 */
export const SCREEN_TRANSITION_TYPES = {
  INSTANT: "instant"
} as const;

export type ScreenTransition = {
  type: string;
  durationMs: number;
};

/**
 * Instant (0ms) transition.
 * Useful for initial screen creation and tests.
 */
export const INSTANT_SCREEN_TRANSITION: ScreenTransition = {
  type: SCREEN_TRANSITION_TYPES.INSTANT,
  durationMs: 0
};

export const NO_SCREEN_TRANSITION: ScreenTransition = {
  type: "none",
  durationMs: 0
};

