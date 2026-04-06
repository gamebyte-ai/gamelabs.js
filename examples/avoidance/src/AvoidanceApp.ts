import { GamelabsApp, UIEvents, AssetRequest, AssetTypes, AssetRequestList, GameCameraBinding, Topdown2dCameraController } from "gamelabsjs";

import { GameScreenView } from "./views/GameScreenView.pixi";
import { GameScreenController } from "./controllers/GameScreenController";
import { GameAreaView } from "./views/GameAreaView.three";
import { GameAreaController } from "./controllers/GameAreaController";
import { GameOverPopupView } from "./views/GameOverPopupView.pixi";
import { GameOverPopupController } from "./controllers/GameOverPopupController";

import { GameEvents } from "./events/GameEvents";
import { WaveManager } from "./utilities/WaveManager";
import { AvoidanceConfig } from "./AvoidanceConfig";
import { AvoidanceAssetIds } from "./AvoidanceAssetIds";
import { AvoidanceUIIds } from "./AvoidanceUIIds";

export class AvoidanceApp extends GamelabsApp {
  private readonly _config = new AvoidanceConfig();
  private readonly _assetRequestList = new AssetRequestList();
  private readonly _gameEvents = new GameEvents();
  private readonly _gameCameraBinding = new GameCameraBinding();

  private _gameAreaView: GameAreaView | null = null;
  private _cameraController: Topdown2dCameraController | null = null;

  constructor(stageEl: HTMLElement) {
    super({ mount: stageEl, sharedContext: true });
  }

  protected override registerModules(): void {
    this.addModule(this._gameCameraBinding);
  }

  protected override configureDI(): void {
    this.diContainer.bindInstance(AvoidanceConfig, this._config);
    this.viewDiContainer.bindInstance(AvoidanceConfig, this._config);
    this.diContainer.bindInstance(GameEvents, this._gameEvents);

    const waveManager = new WaveManager(this._config, this._gameEvents);
    this.diContainer.bindInstance(WaveManager, waveManager);
  }

  protected override configureViews(): void {
    this.viewFactory.registerScreen(AvoidanceUIIds.GameScreen, GameScreenView, GameScreenController);
    this.viewFactory.registerPopup(AvoidanceUIIds.GameOverPopup, GameOverPopupView, GameOverPopupController);
    this.viewFactory.register(GameAreaView, GameAreaController);
  }

  protected override loadAssets(): void {
    this._assetRequestList.addRequest(new AssetRequest(AssetTypes.WorldTexture, AvoidanceAssetIds.Background, new URL("../assets/background.png", import.meta.url).href));
    this._assetRequestList.addRequest(new AssetRequest(AssetTypes.WorldTexture, AvoidanceAssetIds.Player, new URL("../assets/player.png", import.meta.url).href));
    this._assetRequestList.addRequest(new AssetRequest(AssetTypes.WorldTexture, AvoidanceAssetIds.Enemy, new URL("../assets/enemy.png", import.meta.url).href));
    this.assetManager.loadAll(this._assetRequestList.getRequests());
  }

  protected override postInitialize(): void {
    if (!this.world) throw new Error("World is not initialized");

    // Camera: top-down orthographic, centered on game area
    this._gameCameraBinding.cameraManager.initialize(this.world);
    this._cameraController = new Topdown2dCameraController(this._gameCameraBinding.cameraManager);
    const half = this._config.gameAreaSize / 2;
    this._cameraController.followPosition(half, 0, half);
    this.fitCamera(this.width, this.height);

    // World view: game area with player and enemies
    this._gameAreaView = this.viewFactory.createView(GameAreaView);
    this.world.addView(this._gameAreaView);

    // HUD screen
    this.diContainer.getInstance(UIEvents).createScreen(AvoidanceUIIds.GameScreen, this._config.transitions.gameScreenEnter);
  }

  protected override onResize(width: number, height: number, dpr: number): void {
    super.onResize(width, height, dpr);
    this._gameCameraBinding.cameraManager.resize(width, height);
    this.fitCamera(width, height);
  }

  private fitCamera(screenWidth: number, screenHeight: number): void {
    const margin = 1.2;
    const areaSize = this._config.gameAreaSize * margin;
    const aspect = Math.max(0.01, screenWidth) / Math.max(0.01, screenHeight);

    // orthoSize = full visible height. If screen is portrait, widen vertically to fit width.
    const orthoSize = aspect < 1 ? areaSize / aspect : areaSize;
    this._gameCameraBinding.cameraManager.setOrthoSize(orthoSize);
  }

  protected override onStep(timestepSeconds: number): void {
    super.onStep(timestepSeconds);
    this._gameCameraBinding.cameraManager.update(timestepSeconds);
  }

  protected override preDestroy(): void {
    this._cameraController = null;
    this._gameAreaView?.destroy();
    this._gameAreaView = null;
  }
}
