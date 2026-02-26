import { GamelabsApp } from "gamelabsjs";

import { CubeView } from "./views/CubeView.three";
import { GameScreenView } from "./views/GameScreenView.pixi";
import { Example01Binding } from "./Example01Bindings";

export class Example01App extends GamelabsApp {
  public readonly bindings = new Example01Binding();

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

  protected override registerModules(): void {
    this.addModule(this.bindings);
  }
  
  protected override configureDI(): void {
  }

  protected override configureViews(): void {
  }

  protected override loadAssets(): void {
  }

  private createGameScreen(): void {
    this.devUtils.logger.log("Creating game screen");
    if (!this.hud) throw new Error("HUD is not initialized");

    this.viewFactory.createScreen(GameScreenView, null, this.bindings.config.transitions.gameScreenEnter);
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

