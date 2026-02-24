import { GamelabsApp, type IViewFactory } from "gamelabsjs";

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
  readonly config = new Example01Config();
  readonly gameEvents = new GameEvents();
  readonly debugEvents = new DebugEvents();

  private unsubscribeToggleGroundGrid: (() => void) | null = null;
  private unsubscribeToggleStats: (() => void) | null = null;

  private cubeView: CubeView | null = null;

  constructor(stageEl: HTMLElement) {
    super({ mount: stageEl, sharedContext: true });
  }

  protected override postInitialize(): void {

    this.createGroundGrid();
    this.createStatsToggle();
    this.createGameScreen();
    this.createCube();
  }

  override onStep(timestepSeconds: number): void {
    super.onStep(timestepSeconds);
  }

  private createGroundGrid(): void {
    this.devUtils.createGroundGrid({
      size: 20,
      divisions: 20,
      color1: 0x223047,
      color2: 0x152033,
      y: -0.75
    });

    this.unsubscribeToggleGroundGrid = this.debugEvents.onToggleGroundGrid(() => {
      this.devUtils.showGroundGrid(!this.devUtils.isGroundGridVisible);
    });
  }

  private createStatsToggle(): void {

    this.unsubscribeToggleStats = this.debugEvents.onToggleStats(() => {
      this.devUtils.showStats(!this.devUtils.isStatsVisible);
    });
  }

  protected override configureDI(): void {
    this.diContainer.bindInstance(GameEvents, this.gameEvents);
    this.diContainer.bindInstance(DebugEvents, this.debugEvents);
  }

  protected override configureViews(): void {
    this.viewFactory.registerHudView<GameScreenView, GameScreenController> (GameScreenView, { Controller: GameScreenController });
    this.viewFactory.registerHudView<TopBarView,     TopBarController>     (TopBarView,     { Controller: TopBarController     });
    this.viewFactory.registerHudView<DebugBarView,   DebugBarController>   (DebugBarView,   { Controller: DebugBarController   });

    this.viewFactory.registerWorldView<CubeView, CubeController>(CubeView, { Controller: CubeController });
  }

  protected override loadAssets(): void {
    void this.assetLoader.load(Example01Assets.Cube);
  }

  private createGameScreen(): void {
    if (!this.hud) throw new Error("HUD is not initialized");

    this.viewFactory.createScreen(GameScreenView, null, this.config.transitions.gameScreenEnter);
  }

  private createCube(): void {
    if (!this.world) throw new Error("Three world is not initialized");

    this.cubeView = this.viewFactory.createView(CubeView, null);
  }

  protected override preDestroy(): void {
    this.unsubscribeToggleGroundGrid?.();
    this.unsubscribeToggleGroundGrid = null;

    this.unsubscribeToggleStats?.();
    this.unsubscribeToggleStats = null;

    this.cubeView?.destroy();
    this.cubeView = null;
  }
}

