import { GamelabsApp, UIEvents, AssetRequest, AssetTypes, AssetRequestList, GameCameraBinding, GameCameraManager, Topdown2dCameraController, OnScreenControlsBinding } from "@gamebyte/gamelabsjs";

import { GameScreenView } from "./views/GameScreenView.pixi";
import { GameScreenViewController } from "./controllers/GameScreenViewController";
import { GameAreaView } from "./views/GameAreaView.three";
import { GameAreaViewController } from "./controllers/GameAreaViewController";
import { GameOverPopupView } from "./views/GameOverPopupView.pixi";
import { GameOverPopupViewController } from "./controllers/GameOverPopupViewController";

import { GameEvents } from "./events/GameEvents";
import { GameModel } from "./models/GameModel";
import { IGameModel } from "./models/IGameModel";
import { WaveManager } from "./utilities/WaveManager";
import { GameOperations } from "./utilities/GameOperations";
import { PlayerInputManager } from "./utilities/PlayerInputManager";
import { AvoidanceConfig } from "./AvoidanceConfig";
import { AvoidanceAssetIds } from "./AvoidanceAssetIds";
import { AvoidanceUIIds } from "./AvoidanceUIIds";

export class AvoidanceApp extends GamelabsApp {
  private readonly _config = new AvoidanceConfig();
  private readonly _assetRequestList = new AssetRequestList();
  private readonly _gameEvents = new GameEvents();
  private readonly _gameCameraBinding = new GameCameraBinding();
  private readonly _onScreenControlsBinding = new OnScreenControlsBinding();

  private _gameAreaView: GameAreaView | null = null;
  private _cameraController: Topdown2dCameraController | null = null;
  private _cameraManager: GameCameraManager | null = null;

  public constructor(stageEl: HTMLElement) {
    super({ mount: stageEl });
  }

  protected override registerModules(): void {
    this.addModule(this._gameCameraBinding);
    this.addModule(this._onScreenControlsBinding);
  }

  protected override configureDI(): void {
    this.diContainer.bindInstance(AvoidanceConfig, this._config);
    this.viewDiContainer.bindInstance(AvoidanceConfig, this._config);
    this.diContainer.bindInstance(GameEvents, this._gameEvents);
    this.diContainer.bindInstance(GameModel, new GameModel(), [IGameModel]);
    this.diContainer.bindSingleton(WaveManager, () => new WaveManager());
    this.diContainer.bindSingleton(GameOperations, () => new GameOperations());

    const playerInput = new PlayerInputManager();
    playerInput.inject(this.diContainer);
  }

  protected override configureViews(): void {
    this.viewFactory.registerScreen(AvoidanceUIIds.GameScreen, GameScreenView, GameScreenViewController);
    this.viewFactory.registerPopup(AvoidanceUIIds.GameOverPopup, GameOverPopupView, GameOverPopupViewController);
    this.viewFactory.register(GameAreaView, GameAreaViewController);
  }

  protected override loadAssets(): void {
    this._assetRequestList.addRequest(new AssetRequest(AssetTypes.WorldTexture, AvoidanceAssetIds.Background, new URL("../assets/background.png", import.meta.url).href));
    this._assetRequestList.addRequest(new AssetRequest(AssetTypes.WorldTexture, AvoidanceAssetIds.Player, new URL("../assets/player.png", import.meta.url).href));
    this._assetRequestList.addRequest(new AssetRequest(AssetTypes.WorldTexture, AvoidanceAssetIds.Enemy, new URL("../assets/enemy.png", import.meta.url).href));
    this._assetRequestList.addRequest(new AssetRequest(AssetTypes.HudTexture, AvoidanceAssetIds.SlowIcon, new URL("../assets/slow-icon.png", import.meta.url).href));
    this.assetManager.loadAll(this._assetRequestList.getRequests());
  }

  protected override postInitialize(): void {
    if (!this.world || !this.hud) throw new Error("World or HUD is not initialized");

    this._cameraManager = this.diContainer.getInstance(GameCameraManager);
    this._cameraManager.initialize(this.world);
    this._cameraController = new Topdown2dCameraController(this._cameraManager).register();
    const half = this._config.gameAreaSize / 2;
    this._cameraController.followPosition(half, 0, half);
    this._fitCamera(this.width, this.height);

    this._gameAreaView = this.viewFactory.createView(GameAreaView);
    this.world.addView(this._gameAreaView);

    this.diContainer.getInstance(UIEvents).createScreen(AvoidanceUIIds.GameScreen, this._config.transitions.gameScreenEnter);
  }

  protected override onResize(width: number, height: number, dpr: number): void {
    super.onResize(width, height, dpr);
    this._cameraManager?.resize(width, height);
    this._fitCamera(width, height);
  }

  private _fitCamera(screenWidth: number, screenHeight: number): void {
    const margin = 1.2;
    const areaSize = this._config.gameAreaSize * margin;
    const aspect = Math.max(0.01, screenWidth) / Math.max(0.01, screenHeight);
    const orthoSize = aspect < 1 ? areaSize / aspect : areaSize;
    this._cameraManager?.setOrthoSize(orthoSize);
  }

  protected override onStep(timestepSeconds: number): void {
    super.onStep(timestepSeconds);
    this._cameraManager?.update(timestepSeconds);
  }

  protected override preDestroy(): void {
    this._cameraController = null;
    this._gameAreaView?.destroy();
    this._gameAreaView = null;
  }
}
