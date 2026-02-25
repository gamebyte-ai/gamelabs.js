import { GamelabsApp } from "gamelabsjs";

import { CubeView } from "./views/CubeView.three";
import { CubeController } from "./controllers/CubeController";
import { GameScreenView } from "./views/GameScreenView.pixi";
import { GameScreenController } from "./controllers/GameScreenViewController";
import { TopBarView } from "./views/TopBarView.pixi";
import { TopBarController } from "./controllers/TopBarController";
import { DebugBarView } from "./views/DebugBarView.pixi";
import { DebugBarController } from "./controllers/DebugBarController";
import { GameEvents } from "./events/GameEvents";
import { DebugEvents } from "./events/DebugEvents";
import { Example01Config } from "./Example01Config";
import { Example01Assets } from "./Example01Assets";

export class Example01App extends GamelabsApp {
  public readonly config = new Example01Config();
  public readonly gameEvents = new GameEvents();
  public readonly debugEvents = new DebugEvents();

  private _cubeView: CubeView | null = null;

  constructor(stageEl: HTMLElement) {
    super({ mount: stageEl, sharedContext: true });
  }

  protected override postInitialize(): void {
    this.createGameScreen();
    this.createCube();
  }

  protected override onStep(timestepSeconds: number): void {
    super.onStep(timestepSeconds);
  }

  protected override configureDI(): void {
    this.devUtils.logger.log("Configuring DI");
    this.diContainer.bindInstance(GameEvents, this.gameEvents);
    this.diContainer.bindInstance(DebugEvents, this.debugEvents);
  }

  protected override configureViews(): void {
    this.devUtils.logger.log("Configuring views");
    this.viewFactory.registerHudView<GameScreenView, GameScreenController> (GameScreenView, { Controller: GameScreenController });
    this.viewFactory.registerHudView<TopBarView,     TopBarController>     (TopBarView,     { Controller: TopBarController     });
    this.viewFactory.registerHudView<DebugBarView,   DebugBarController>   (DebugBarView,   { Controller: DebugBarController   });

    this.viewFactory.registerWorldView<CubeView, CubeController>(CubeView, { Controller: CubeController });
  }

  protected override loadAssets(): void {
    this.devUtils.logger.log("Loading assets");
    void this.assetLoader.load(Example01Assets.Cube);
  }

  private createGameScreen(): void {
    this.devUtils.logger.log("Creating game screen");
    if (!this.hud) throw new Error("HUD is not initialized");

    this.viewFactory.createScreen(GameScreenView, null, this.config.transitions.gameScreenEnter);
  }

  private createCube(): void {
    this.devUtils.logger.log("Creating cube");
    if (!this.world) throw new Error("Three world is not initialized");

    this._cubeView = this.viewFactory.createView(CubeView, null);
  }

  protected override preDestroy(): void {
    this._cubeView?.destroy();
    this._cubeView = null;
  }
}

