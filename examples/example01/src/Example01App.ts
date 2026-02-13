import { GamelabsApp, Hud, type IViewFactory, type UpdateService, ViewFactory, World } from "gamelabsjs";
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

type Example01ViewContext = {
  events: GameEvents;
  debugEvents: DebugEvents;
  updates: UpdateService;
};

export class Example01App extends GamelabsApp {
  readonly events = new GameEvents();
  readonly debugEvents = new DebugEvents();

  private unsubscribeToggleGroundGrid: (() => void) | null = null;
  private groundGrid: ReturnType<World["showGroundGrid"]> | null = null;
  private groundGridVisible = true;

  private viewFactory: ViewFactory<Example01ViewContext> | null = null;

  private world: World | null = null;
  private cubeView: CubeView | null = null;

  private hud: Hud | null = null;
  private gameScreen: GameScreenView | null = null;

  constructor(stageEl: HTMLElement) {
    super({ mount: stageEl });
  }

  override async initialize(): Promise<void> {
    await this.createWorld();

    await this.createHud();

    this.createViewFactory();

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

  private createViewFactory(): void {
    this.viewFactory = new ViewFactory(this.binder, {
      events: this.events,
      debugEvents: this.debugEvents,
      updates: this.updates
    });

    // Pixi screen layer (HUD stage).
    this.viewFactory.register<GameScreenView, object, GameScreenViewController>(
      GameScreenView,
      {
        create: () => new GameScreenView({ viewFactory: this.viewFactory as IViewFactory }),
        Controller: GameScreenViewController,
        attachToParent: (parent: unknown, view: unknown) =>
          (parent as Container).addChild(view as GameScreenView),
        deps: (_ctx: Example01ViewContext) => ({})
      }
    );

    // GameScreen subviews (parent = GameScreenView). These are created by `GameScreenView` via injected `IViewFactory`.
    this.viewFactory.register<TopBarView, { events: GameEvents; debugEvents: DebugEvents }, TopBarController>(TopBarView, {
      Controller: TopBarController,
      attachToParent: (parent: unknown, view: unknown) =>
        (parent as GameScreenView).addChild(view as TopBarView),
      deps: (ctx: Example01ViewContext) => ({ events: ctx.events, debugEvents: ctx.debugEvents })
    });

    this.viewFactory.register<DebugBarView, { events: DebugEvents }, DebugBarController>(DebugBarView, {
      Controller: DebugBarController,
      attachToParent: (parent: unknown, view: unknown) =>
        (parent as GameScreenView).addChild(view as DebugBarView),
      deps: (ctx: Example01ViewContext) => ({ events: ctx.debugEvents })
    });

    // Three world layer.
    this.viewFactory.register<CubeView, { update: UpdateService; events: GameEvents }, CubeController>(CubeView, {
      Controller: CubeController,
      attachToParent: (parent: unknown, view: unknown) => (parent as World).add(view as CubeView),
      deps: (ctx: Example01ViewContext) => ({ update: ctx.updates, events: ctx.events })
    });
  }

  private createGameScreen(): void {
    if (!this.hud) throw new Error("HUD is not initialized");
    if (!this.viewFactory) throw new Error("ViewFactory is not initialized");

    this.gameScreen = this.viewFactory.createView(GameScreenView, this.hud.app.stage);
  }

  private createCube(): void {
    if (!this.world) throw new Error("Three world is not initialized");
    if (!this.viewFactory) throw new Error("ViewFactory is not initialized");

    this.cubeView = this.viewFactory.createView(CubeView, this.world);
  }

  override destroy(): void {
    this.unsubscribeToggleGroundGrid?.();
    this.unsubscribeToggleGroundGrid = null;
    this.groundGrid = null;
    this.viewFactory = null;

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

