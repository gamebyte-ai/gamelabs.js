import { SCREEN_TRANSITION_TYPES, type ScreenTransition } from "gamelabsjs";

export class Example03Config {
  readonly boardColumnCount = 10;
  readonly boardRowCount = 8;

  readonly transitions: {
    gameScreenEnter: ScreenTransition;
  } = {
    gameScreenEnter: {
      type: SCREEN_TRANSITION_TYPES.INSTANT,
      durationMs: 0
    }
  };
}
