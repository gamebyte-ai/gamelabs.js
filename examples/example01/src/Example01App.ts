import { GamelabsApp, Hud, World } from "gamelabsjs";

import { CubeView } from "./views/CubeView.three";
import { CubeController } from "./controllers/CubeController";
import { TopBarView } from "./views/TopBarView.pixi";
import { TopBarController } from "./controllers/TopBarController";
import { DebugBarView } from "./views/DebugBarView.pixi";
import { DebugBarController } from "./controllers/DebugBarController";
import { GameEvents } from "./events/GameEvents";
import { DebugEvents } from "./events/DebugEvents";

export class Example01App extends GamelabsApp {
  readonly stageEl: HTMLElement;
  readonly events = new GameEvents();
  readonly debugEvents = new DebugEvents();

  private unsubscribeToggleGroundGrid: (() => void) | null = null;
  private groundGrid: ReturnType<World["showGroundGrid"]> | null = null;
  private groundGridVisible = true;

  private world: World | null = null;
  private cubeView: CubeView | null = null;

  private hud: Hud | null = null;
  private topBar: TopBarView | null = null;
  private debugBar: DebugBarView | null = null;

  constructor(stageEl: HTMLElement) {
    super({ mode: "hybrid" });
    this.stageEl = stageEl;
  }

  override async initialize(): Promise<void> {
    this.createWorld();

    await this.createHud();

    this.createCube();

    this.createTopBar();
    this.createDebugBar();

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
    this.topBar?.resize(w, h);
    this.debugBar?.resize(w, h);
  }

  override onStep(timestepSeconds: number): void {
    super.onStep(timestepSeconds);
    this.world?.render();
  }

  private createWorld(): void {
    this.world = World.create(this.canvas, { mount: this.stageEl, canvasClassName: "layer world3d" });
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
    this.hud = await Hud.create(this.stageEl);
  }

  private createTopBar(): void {
    if (!this.hud) throw new Error("HUD is not initialized");

    this.topBar = new TopBarView();
    this.hud.app.stage.addChild(this.topBar);

    this.binder.bind(this.topBar, TopBarController, { events: this.events });
  }

  private createDebugBar(): void {
    if (!this.hud) throw new Error("HUD is not initialized");

    this.debugBar = new DebugBarView();
    this.hud.app.stage.addChild(this.debugBar);

    this.binder.bind(this.debugBar, DebugBarController, { events: this.debugEvents });
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
    this.topBar = null;
    this.debugBar = null;

    this.world?.destroy();
    this.world = null;
    this.cubeView = null;

    this.canvas.remove();

    super.destroy();
  }
}

