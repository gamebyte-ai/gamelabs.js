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
import { AppConfig } from "./AppConfig";

export class Example01App extends GamelabsApp {
  readonly config = new AppConfig();
  readonly gameEvents = new GameEvents();
  readonly debugEvents = new DebugEvents();

  private unsubscribeToggleGroundGrid: (() => void) | null = null;
  private unsubscribeToggleStats: (() => void) | null = null;
  private statsVisible = false;

  private cubeView: CubeView | null = null;

  constructor(stageEl: HTMLElement) {
    // Enable shared WebGL context: Three.js + PixiJS render into the same canvas.
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
    if (!this.worldDebugger) throw new Error("WorldDebugger is not initialized");

    this.worldDebugger.createGroundGrid({
      size: 20,
      divisions: 20,
      color1: 0x223047,
      color2: 0x152033,
      y: -0.75
    });

    this.unsubscribeToggleGroundGrid = this.debugEvents.onToggleGroundGrid(() => {
      this.worldDebugger?.showGroundGrid(!this.worldDebugger.isGroundGridVisible);
    });
  }

  private createStatsToggle(): void {
    this.statsVisible = false;
    this.hud?.showStats(false);

    this.unsubscribeToggleStats = this.debugEvents.onToggleStats(() => {
      this.statsVisible = !this.statsVisible;
      this.hud?.showStats(this.statsVisible);
    });
  }

  protected override configureDI(): void {
    this.di.bindInstance(GameEvents, this.gameEvents);
    this.di.bindInstance(DebugEvents, this.debugEvents);
  }

  protected override configureViews(): void {
    this.viewFactory.register<GameScreenView, GameScreenController>(
      GameScreenView,
      {
        create: () => new GameScreenView({ viewFactory: this.viewFactory as IViewFactory }),
        Controller: GameScreenController,
        attachToParent: this.attachToHud,
      }
    );

    this.viewFactory.register<TopBarView, TopBarController>(TopBarView, {
      Controller: TopBarController,
      attachToParent: this.attachToHud,
    });

    this.viewFactory.register<DebugBarView, DebugBarController>(DebugBarView, {
      Controller: DebugBarController,
      attachToParent: this.attachToHud,
    });

    this.viewFactory.register<CubeView, CubeController>(CubeView, {
      Controller: CubeController,
      attachToParent: this.attachToWorld,
    });
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

