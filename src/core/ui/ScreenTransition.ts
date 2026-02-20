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
