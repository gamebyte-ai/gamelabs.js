import { GamelabsApp, Hud, type IViewFactory, World } from "gamelabsjs";
import type { Container } from "pixi.js";

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

  private world: World | null = null;
  private cubeView: CubeView | null = null;

  private hud: Hud | null = null;
  private gameScreen: GameScreenView | null = null;

  private readonly attachToHud = (parent: unknown, view: unknown): void => {
    // Pixi-style containers (e.g. HUD stage, GameScreenView) use addChild(view)
    (parent as Container).addChild(view as any);
  };

  private readonly attachToWorld = (parent: unknown, view: unknown): void => {
    // Three-style worlds use add(view)
    (parent as World).add(view as any);
  };

  constructor(stageEl: HTMLElement) {
    super({ mount: stageEl });
  }

  override async initialize(): Promise<void> {
    await this.createWorld();

    await this.createHud();

    this.setupCompositionRoot();

    this.createGameScreen();

    this.createCube();

    // Force first layout pass.
    this.requestResize();
  }

  override onResize(width: number, height: number, dpr: number): void {
    const w = Math.max(1, Math.floor(width));
    const h = Math.max(1, Math.floor(height));
    const clampedDpr = Math.min(dpr || 1, 2);

    super.resize(w, h);

    this.world?.resize(w, h, clampedDpr);

    this.hud?.resize(w, h);
    this.gameScreen?.resize(w, h);
  }

  override onStep(timestepSeconds: number): void {
    super.onStep(timestepSeconds);
    this.world?.render();
  }

  private async createWorld(): Promise<void> {
    if (!this.mount) throw new Error("Missing mount element");
    this.world = await World.create(this.canvas, { mount: this.mount, canvasClassName: "layer world3d" });
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

  private async createHud(): Promise<void> {
    if (!this.mount) throw new Error("Missing mount element");
    this.hud = await Hud.create(this.mount);
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

