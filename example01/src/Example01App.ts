import { GamelabsApp } from "gamelabsjs";

import { Example01CubeView } from "./views/Example01CubeView.three";
import { Example01CubeController } from "./controllers/Example01CubeController";
import { Example01World } from "./world/Example01World";
import { Example01Hud } from "./hud/Example01Hud";
import { Example01TopBarView } from "./views/Example01TopBarView.pixi";
import { Example01TopBarController } from "./controllers/Example01TopBarController";

export class Example01App extends GamelabsApp {
  readonly stageEl: HTMLElement;

  // --- Three.js world (system/root owned by the app)
  private world: Example01World | null = null;
  private cubeView: Example01CubeView | null = null;

  private hud: Example01Hud | null = null;
  private topBar: Example01TopBarView | null = null;

  constructor(stageEl: HTMLElement) {
    super({ mode: "hybrid" });
    this.stageEl = stageEl;
  }

  override async initialize(): Promise<void> {
    this.createWorld();

    await this.createHud();

    this.createCube();

    this.createTopBar();

    // Force first layout pass.
    this.onResize();
  }

  override onResize(): void {
    const rect = this.stageEl.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Base canvas size.
    super.resize(width, height);

    // Three world.
    this.world?.resize(width, height, dpr);

    // Pixi UI.
    this.hud?.resize(width, height);
    this.topBar?.resize(width, height);
  }

  private createWorld(): void {
    // --- Three.js world (bottom layer): canvas provided by GamelabsApp
    this.world = Example01World.create(this.stageEl, this.canvas);
  }

  private async createHud(): Promise<void> {
    // --- PixiJS HUD (top layer): owned by Example01Hud system
    this.hud = await Example01Hud.create(this.stageEl);
  }

  private createTopBar(): void {
    if (!this.hud) throw new Error("HUD is not initialized");
    if (!this.cubeView) throw new Error("Cube view is not initialized");

    this.topBar = new Example01TopBarView();
    this.hud.app.stage.addChild(this.topBar);

    this.binder.bind(this.topBar, Example01TopBarController, { cube: this.cubeView });
  }

  private renderWorld(): void {
    this.world?.render();
  }

  private createCube(): void {
    if (!this.world) throw new Error("Three world is not initialized");

    this.cubeView = new Example01CubeView();
    this.world.add(this.cubeView);

    this.binder.bind(this.cubeView, Example01CubeController, {
      update: this.updates,
      render: () => this.renderWorld()
    });
  }

  override destroy(): void {
    // Let the base class destroy bound controllers/views and clear updates.
    // Here we only cleanup external engine resources.
    this.hud?.destroy();
    this.hud = null;
    this.topBar = null;

    this.world?.destroy();
    this.world = null;
    this.cubeView = null;

    this.canvas.remove();

    super.destroy();
  }
}

