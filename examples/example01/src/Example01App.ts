import { GamelabsApp, Hud, World } from "gamelabsjs";

import { CubeView } from "./views/CubeView.three";
import { CubeController } from "./controllers/CubeController";
import { GameScreenView } from "./views/GameScreenView.pixi";
import { GameScreenViewController } from "./controllers/GameScreenViewController";
import { GameEvents } from "./events/GameEvents";
import { DebugEvents } from "./events/DebugEvents";

export class Example01App extends GamelabsApp {
  readonly events = new GameEvents();
  readonly debugEvents = new DebugEvents();

  private unsubscribeToggleGroundGrid: (() => void) | null = null;
  private groundGrid: ReturnType<World["showGroundGrid"]> | null = null;
  private groundGridVisible = true;

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

  private createGameScreen(): void {
    if (!this.hud) throw new Error("HUD is not initialized");

    this.gameScreen = new GameScreenView();
    this.hud.app.stage.addChild(this.gameScreen);

    // Create at application start with an instant transition.
    this.binder.bind(this.gameScreen, GameScreenViewController, {
      events: this.events,
      debugEvents: this.debugEvents
    });
  }

  private createCube(): void {
    if (!this.world) throw new Error("Three world is not initialized");

    this.cubeView = new CubeView();
    this.world.add(this.cubeView);

    this.binder.bind(this.cubeView, CubeController, {
      update: this.updates,
      events: this.events
    });
  }

  override destroy(): void {
    this.unsubscribeToggleGroundGrid?.();
    this.unsubscribeToggleGroundGrid = null;
    this.groundGrid = null;

    this.hud?.destroy();
    this.hud = null;
    this.gameScreen = null;

    this.world?.destroy();
    this.world = null;
    this.cubeView = null;

    this.canvas.remove();

    super.destroy();
  }
}

