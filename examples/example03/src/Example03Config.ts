import { SCREEN_TRANSITION_TYPES, type ScreenTransition } from "gamelabsjs";

export class Example03Config {
  readonly boardId = 1;
  readonly boardColumnCount = 3;
  readonly boardRowCount = 3;

  readonly transitions: {
    gameScreenEnter: ScreenTransition;
  } = {
    gameScreenEnter: {
      type: SCREEN_TRANSITION_TYPES.INSTANT,
      durationMs: 0
    }
  };
}
