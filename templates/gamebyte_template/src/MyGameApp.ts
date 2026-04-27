import { GamelabsApp, LogTypes, UIEvents } from '@gamebyte/gamelabsjs';

import { GameScreenView } from './views/GameScreenView.pixi';
import { GameScreenViewController } from './controllers/GameScreenViewController';

import { MyGameConfig } from './MyGameConfig';
import { MyGameUIIds } from './MyGameUIIds';

export class MyGameApp extends GamelabsApp {
  private readonly _config = new MyGameConfig();

  public constructor(stageEl: HTMLElement) {
    super({ mount: stageEl });
  }

  protected override configureDI(): void {
    this.diContainer.bindInstance(MyGameConfig, this._config);
  }

  protected override configureViews(): void {
    this.viewFactory.registerScreen(MyGameUIIds.GameScreen, GameScreenView, GameScreenViewController);
  }

  protected override postInitialize(): void {
    if (!this.hud || !this.world) {
      this.logger.log('HUD or World is not initialized', LogTypes.Error);
      throw new Error('HUD or World is not initialized');
    }

    this.diContainer.getInstance(UIEvents).createScreen(
      MyGameUIIds.GameScreen,
      this._config.transitions.gameScreenEnter,
    );
  }
}
