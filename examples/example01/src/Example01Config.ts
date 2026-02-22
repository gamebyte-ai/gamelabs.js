import { SCREEN_TRANSITION_TYPES, type ScreenTransition } from "gamelabsjs";

/**
 * Example-level configuration bucket.
 * Keep things here that are expected to change per project (transitions, tuning, etc.).
 */
export class Example01Config {
  readonly transitions: {
    gameScreenEnter: ScreenTransition;
  } = {
    gameScreenEnter: {
      type: SCREEN_TRANSITION_TYPES.INSTANT,
      durationMs: 0
    }
  };
}

