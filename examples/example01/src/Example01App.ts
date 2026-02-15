import { GamelabsApp, Hud, type IViewFactory, World } from "gamelabsjs";

import { CubeView } from "./views/CubeView.three";
import { CubeController } from "./controllers/CubeController";
import { GameScreenView } from "./views/GameScreenView.pixi";
import { GameScreenViewController } from "./controllers/GameScreenViewController";
import { TopBarView } from "./views/TopBarView.pixi";
import { TopBarController } from "./controllers/TopBarController";
import { DebugBarView } from "./views/DebugBarView.pixi";
import { DebugBarController } from "./controllers/DebugBarController";
import { GameEvents } from "./events/GameEvents";
import { DebugEvents } from "./events/DebugEvents";

export class Example01App extends GamelabsApp {
  readonly gameEvents = new GameEvents();
  readonly debugEvents = new DebugEvents();

  private unsubscribeToggleGroundGrid: (() => void) | null = null;
  private groundGrid: ReturnType<World["showGroundGrid"]> | null = null;
  private groundGridVisible = true;

  private cubeView: CubeView | null = null;

  private gameScreen: GameScreenView | null = null;

  constructor(stageEl: HTMLElement) {
    super({ mount: stageEl });
  }

  protected override postInitialize(): void {

    this.createGroundGrid();

    this.createGameScreen();

    this.createCube();
  }

  override onResize(width: number, height: number, dpr: number): void {

    this.gameScreen?.resize(width, height);
  }

  override onStep(timestepSeconds: number): void {
    super.onStep(timestepSeconds);
  }

  private createGroundGrid(): void {
    if (!this.world) throw new Error("World is not initialized");

    this.groundGrid = this.world.showGroundGrid({
      size: 20,
      divisions: 20,
      color1: 0x223047,
      color2: 0x152033,
      y: -0.75
    });
    this.groundGridVisible = true;

    this.unsubscribeToggleGroundGrid = this.debugEvents.onToggleGroundGrid(() => {
      this.groundGridVisible = !this.groundGridVisible;
      if (this.groundGrid) this.groundGrid.visible = this.groundGridVisible;
    });
  }

  protected override configureDI(): void {
    this.di.bindInstance(GameEvents, this.gameEvents);
    this.di.bindInstance(DebugEvents, this.debugEvents);
  }

  protected override configureViews(): void {
    // Pixi screen layer (HUD stage).
    this.viewFactory.register<GameScreenView, GameScreenViewController>(
      GameScreenView,
      {
        create: () => new GameScreenView({ viewFactory: this.viewFactory as IViewFactory }),
        Controller: GameScreenViewController,
        attachToParent: this.attachToHud,
      }
    );

    // GameScreen subviews (parent = GameScreenView). These are created by `GameScreenView` via injected `IViewFactory`.
    this.viewFactory.register<TopBarView, TopBarController>(TopBarView, {
      Controller: TopBarController,
      attachToParent: this.attachToHud,
    });

    this.viewFactory.register<DebugBarView, DebugBarController>(DebugBarView, {
      Controller: DebugBarController,
      attachToParent: this.attachToHud,
    });

    // Three world layer.
    this.viewFactory.register<CubeView, CubeController>(CubeView, {
      Controller: CubeController,
      attachToParent: this.attachToWorld,
    });
  }

  private createGameScreen(): void {
    if (!this.hud) throw new Error("HUD is not initialized");

    this.gameScreen = this.viewFactory.createView(GameScreenView, this.hud.app.stage);
  }

  private createCube(): void {
    if (!this.world) throw new Error("Three world is not initialized");

    this.cubeView = this.viewFactory.createView(CubeView, this.world);
  }

  override destroy(): void {
    this.unsubscribeToggleGroundGrid?.();
    this.unsubscribeToggleGroundGrid = null;
    this.groundGrid = null;

    // Views now own controller cleanup; destroy views explicitly.
    this.gameScreen?.destroy();
    this.gameScreen = null;

    this.cubeView?.destroy();
    this.cubeView = null;

    this.hud?.destroy();
    this.hud = null;

    this.world?.destroy();
    this.world = null;

    this.canvas.remove();

    super.destroy();
  }
}

