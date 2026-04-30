import {
  Front2dCameraController,
  GameCameraBinding,
  GameCameraManager,
  GamelabsApp,
  LogTypes,
  UIComponentsBinding,
  UIEvents,
} from "@gamebyte/gamelabsjs";

import { BubbleShooterConfig } from "./BubbleShooterConfig";
import { BubbleShooterUIIds } from "./BubbleShooterUIIds";
import { BubbleGridLayout } from "./utilities/BubbleGridLayout";
import { GameAreaView } from "./views/GameAreaView.three";
import { GameAreaViewController } from "./controllers/GameAreaViewController";
import { GameScreenView } from "./views/GameScreenView.pixi";
import { GameScreenViewController } from "./controllers/GameScreenViewController";

/**
 * Bubble Shooter scaffold.
 *
 * Step 1 in a multi-step build: only the play area frame and the empty
 * bubble grid are rendered. No bubbles, shooter, or input yet — the grid
 * is the foundation later mechanics (firing, neighbour matching, cluster
 * pop) will plug into.
 */
export class BubbleShooterApp extends GamelabsApp {
  private readonly _config = new BubbleShooterConfig();
  private readonly _layout = new BubbleGridLayout(this._config);
  private readonly _gameCameraBinding = new GameCameraBinding();
  private readonly _uiComponentsBinding = new UIComponentsBinding();

  private _gameAreaView: GameAreaView | null = null;
  private _cameraManager: GameCameraManager | null = null;
  private _cameraController: Front2dCameraController | null = null;

  public constructor(stageEl: HTMLElement) {
    super({ mount: stageEl });
  }

  protected override registerModules(): void {
    this.addModule(this._gameCameraBinding);
    this.addModule(this._uiComponentsBinding);
  }

  protected override configureDI(): void {
    this.diContainer.bindInstance(BubbleShooterConfig, this._config);
    this.viewDiContainer.bindInstance(BubbleShooterConfig, this._config);
    this.diContainer.bindInstance(BubbleGridLayout, this._layout);
    this.viewDiContainer.bindInstance(BubbleGridLayout, this._layout);
  }

  protected override configureViews(): void {
    this.viewFactory.registerScreen(BubbleShooterUIIds.GameScreen, GameScreenView, GameScreenViewController);
    this.viewFactory.register(GameAreaView, GameAreaViewController);
  }

  protected override postInitialize(): void {
    if (!this.world || !this.hud) {
      this.logger.log("World or HUD is not initialized", LogTypes.Error);
      throw new Error("World or HUD is not initialized");
    }

    this._gameAreaView = this.viewFactory.createView(GameAreaView);
    this.world.addView(this._gameAreaView);

    this._cameraManager = this.diContainer.getInstance(GameCameraManager);
    this._cameraManager.initialize(this.world);
    this._cameraController = new Front2dCameraController(this._cameraManager).register();
    this._cameraController.followPosition(0, 0, 0);
    this._fitCamera(this.width, this.height);

    this.diContainer.getInstance(UIEvents).createScreen(BubbleShooterUIIds.GameScreen, this._config.transitions.gameScreenEnter);
  }

  protected override onResize(width: number, height: number, dpr: number): void {
    super.onResize(width, height, dpr);
    this._cameraManager?.resize(width, height);
    this._fitCamera(width, height);
  }

  /**
   * Pick an ortho size that always fits the play area plus a uniform margin
   * on every side. With ortho conventions `visible_h = orthoSize` and
   * `visible_w = orthoSize * aspect`, both spans must clear the area extents.
   */
  private _fitCamera(screenWidth: number, screenHeight: number): void {
    if (screenWidth <= 0 || screenHeight <= 0) return;
    const aspect = screenWidth / screenHeight;
    const areaWidth = this._layout.gridWidth + 2 * this._config.playAreaPaddingX;
    const areaHeight = this._layout.gridHeight + this._config.playAreaPaddingTop + this._config.playAreaPaddingBottom;
    const requiredW = areaWidth + 2 * this._config.cameraMargin;
    const requiredH = areaHeight + 2 * this._config.cameraMargin;
    const orthoForHeight = requiredH;
    const orthoForWidth = requiredW / aspect;
    this._cameraManager?.setOrthoSize(Math.max(orthoForHeight, orthoForWidth));
  }

  protected override onStep(timestepSeconds: number): void {
    super.onStep(timestepSeconds);
    this._cameraManager?.update(timestepSeconds);
  }

  protected override preDestroy(): void {
    this._cameraController = null;
    this._gameAreaView?.destroy();
    this._gameAreaView = null;
    super.preDestroy();
  }
}
