import { SCREEN_TRANSITION_TYPES, type ScreenTransition } from "gamelabsjs";

/**
 * Example-level configuration bucket.
 * Keep things here that are expected to change per project (transitions, tuning, etc.).
 */
export class AppConfig {
  readonly transitions: {
    mainScreenEnter: ScreenTransition;
    levelProgressScreenEnter: ScreenTransition;
  } = {
    mainScreenEnter: {
      type: SCREEN_TRANSITION_TYPES.INSTANT,
      durationMs: 0
    },
    levelProgressScreenEnter: {
      type: SCREEN_TRANSITION_TYPES.INSTANT,
      durationMs: 0
    }
  };
}

