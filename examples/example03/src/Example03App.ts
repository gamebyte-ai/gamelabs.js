import * as THREE from "three";
import { GamelabsApp, LogTypes, GameCameraBinding, Topdown3dCameraController, IViewFactory } from "gamelabsjs";
import { GameScreenView } from "./views/GameScreenView.pixi";
import { GameScreenController } from "./controllers/GameScreenController";
import { GridOperations } from "./utilities/GridOperations";
import { Example03Config } from "./Example03Config";
import { Example03GameGridBinding } from "./Example03GameGridBinding";
import { Example03GameGridView } from "./views/Example03GameGridView.three";

export class Example03App extends GamelabsApp {
  private readonly _config = new Example03Config();
  private readonly _gameCameraBinding = new GameCameraBinding();
  private readonly _gameGridBinding = new Example03GameGridBinding();
  private _gameGridView: Example03GameGridView | null = null;
  private _cameraController: Topdown3dCameraController | null = null;

  constructor(stageEl: HTMLElement) {
    super({ mount: stageEl, sharedContext: true });
  }

  protected override registerModules(): void {
    this.addModule(this._gameCameraBinding);
    this.addModule(this._gameGridBinding);
  }

  protected override configureDI(): void {
    this.diContainer.bindInstance(Example03Config, this._config);
    this.diContainer.bindInstance(IViewFactory, this.viewFactory);
    this.diContainer.bindSingleton(GridOperations, (resolver) => new GridOperations());
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

    const gridOps = this.diContainer.getInstance(GridOperations);
    gridOps.createGrid();
    this._gameGridView = this.viewFactory.createView(Example03GameGridView, null);

    this.world.scene.fog = new THREE.Fog(0x0b0f14, 15, 50);

    this._gameCameraBinding.cameraManager.initialize(this.world);
    this._cameraController = new Topdown3dCameraController(this._gameCameraBinding.cameraManager);
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
