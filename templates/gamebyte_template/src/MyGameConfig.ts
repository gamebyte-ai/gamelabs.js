import { SCREEN_TRANSITION_TYPES, type ScreenTransition } from '@gamebyte/gamelabsjs';

export class MyGameConfig {
  public readonly title = 'My Game';

  public readonly transitions: {
    gameScreenEnter: ScreenTransition;
  } = {
    gameScreenEnter: {
      type: SCREEN_TRANSITION_TYPES.INSTANT,
      durationMs: 0,
    },
  };
}
