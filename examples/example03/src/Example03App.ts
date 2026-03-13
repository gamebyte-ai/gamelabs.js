import * as THREE from "three";
import { GamelabsApp, LogTypes, GameCameraBinding, Isometric3dCameraController, GameGridBinding, GameGridModel, GameGridEvents, GameGridView } from "gamelabsjs";

import { GameScreenView } from "./views/GameScreenView.pixi";
import { GameScreenController } from "./controllers/GameScreenController";
import { GridOperations } from "./utilities/GridOperations";
import { Example03Config } from "./Example03Config";

export class Example03App extends GamelabsApp {
  private readonly _config = new Example03Config();
  private readonly _gameCameraBinding = new GameCameraBinding();
  private readonly _gameGridBinding = new GameGridBinding();
  private _gameGridView: GameGridView | null = null;
  private _cameraController: Isometric3dCameraController | null = null;

  constructor(stageEl: HTMLElement) {
    super({ mount: stageEl, sharedContext: true });
  }

  protected override registerModules(): void {
    this.addModule(this._gameCameraBinding);
    this.addModule(this._gameGridBinding);
  }

  protected override configureDI(): void {
    this.diContainer.bindInstance(Example03Config, this._config);
  }

  protected override configureViews(): void {
    this.viewFactory.registerHudView<GameScreenView, GameScreenController>(GameScreenView, { Controller: GameScreenController });
  }

  protected override postInitialize(): void {
    if (!this.hud) {
      this.logger.log("HUD is not initialized", LogTypes.Error);
      throw new Error("HUD is not initialized");
    }

    this.viewFactory.createScreen(GameScreenView, null, this._config.transitions.gameScreenEnter);

    if (!this.world) {
      this.logger.log("Three world is not initialized", LogTypes.Error);
      throw new Error("Three world is not initialized");
    }

    this._gameGridView = GridOperations.createGrid(
      this.diContainer.getInstance(GameGridModel),
      this.diContainer.getInstance(GameGridEvents),
      this._config,
      this.viewFactory
    );

    this.world.scene.fog = new THREE.Fog(0x0b0f14, 15, 50);

    this._gameCameraBinding.cameraManager.initialize(this.world);
    this._cameraController = new Isometric3dCameraController(this._gameCameraBinding.cameraManager);
    const centerX = (this._config.boardColumnCount - 1) / 2;
    const centerZ = (this._config.boardRowCount - 1) / 2;
    this._cameraController.followPosition(centerX, 0.5, centerZ);
  }

  protected override onResize(width: number, height: number, dpr: number): void {
    super.onResize(width, height, dpr);
    this._gameCameraBinding.cameraManager.resize(width, height);
  }

  protected override onStep(timestepSeconds: number): void {
    super.onStep(timestepSeconds);
    this._gameCameraBinding.cameraManager.update(timestepSeconds);
  }

  protected override preDestroy(): void {
    this._cameraController = null;
    this._gameGridView?.destroy();
    this._gameGridView = null;
  }
}
