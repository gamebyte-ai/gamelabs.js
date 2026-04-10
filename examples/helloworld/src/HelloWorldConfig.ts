import { SCREEN_TRANSITION_TYPES, type ScreenTransition } from "@gamebyte/gamelabsjs";

/**
 * Application-level configuration bucket.
 * Keep things here that are expected to change per project (transitions, tuning, etc.).
 */
export class HelloWorldConfig {
  readonly minCameraDistance = 3;
  readonly maxCameraDistance = 10;
  readonly transitions: {
    gameScreenEnter: ScreenTransition;
  } = {
    gameScreenEnter: {
      type: SCREEN_TRANSITION_TYPES.INSTANT,
      durationMs: 0
    }
  };
}

