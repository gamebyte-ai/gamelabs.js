import { GamelabsApp } from "gamelabsjs";

import { MainScreen, MainScreenController, MainScreenEvents } from "../modules/mainscreen/src/index.js";

/**
 * Example02: minimal app scaffold that only adds a ground grid.
 *
 * Everything else is intentionally left as empty overrides to act as a template.
 */
export class Example02App extends GamelabsApp {
  private mainScreen: MainScreen | null = null;

  constructor(stageEl: HTMLElement) {
    // Enable shared WebGL context: Three.js + PixiJS render into the same canvas.
    super({ mount: stageEl, sharedContext: true });
  }

  protected override postInitialize(): void {
    this.createGroundGrid();
    this.hud?.showStats(true);
    this.createMainScreen();
  }

  override onResize(width: number, height: number, _dpr: number): void {
    this.mainScreen?.resize(width, height);
  }

  protected override onStep(timestepSeconds: number): void {
    // Intentionally empty (template), keep base behavior consistent.
    super.onStep(timestepSeconds);
  }

  protected override configureDI(): void {
    this.di.bindInstance(MainScreenEvents, new MainScreenEvents());
  }

  protected override configureViews(): void {
    this.viewFactory.register<MainScreen, MainScreenController>(MainScreen, {
      Controller: MainScreenController,
      attachToParent: this.attachToHud
    });
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
  }

  private createMainScreen(): void {
    this.mainScreen = this.viewFactory.createView(MainScreen, null);
  }

  protected override preDestroy(): void {
    this.mainScreen?.destroy();
    this.mainScreen = null;
  }
}

