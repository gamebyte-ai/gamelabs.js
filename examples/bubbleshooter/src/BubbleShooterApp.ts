import {
  AssetRequest,
  AssetRequestList,
  AssetTypes,
  ControlAnchor,
  ControlType,
  Front2dCameraController,
  GameCameraBinding,
  GameCameraManager,
  GamelabsApp,
  LogTypes,
  OnScreenControlManager,
  OnScreenControlsBinding,
  UIComponentsBinding,
  UIEvents,
  World,
} from "@gamebyte/gamelabsjs";

import { BubbleShooterAssetIds } from "./BubbleShooterAssetIds";
import { BubbleShooterConfig } from "./BubbleShooterConfig";
import { BubbleShooterUIIds } from "./BubbleShooterUIIds";
import { BubbleGridLayout } from "./utilities/BubbleGridLayout";
import { BubbleGrid } from "./models/BubbleGrid";
import { IBubbleGrid } from "./models/IBubbleGrid";
import { Shooter } from "./models/Shooter";
import { IShooter } from "./models/IShooter";
import { Score } from "./models/Score";
import { IScore } from "./models/IScore";
import { GameEvents } from "./events/GameEvents";
import { GameOperations } from "./utilities/GameOperations";
import { AimTrajectoryCalculator } from "./utilities/AimTrajectoryCalculator";
import { MatchFinder } from "./utilities/MatchFinder";
import { FloatingBubbleFinder } from "./utilities/FloatingBubbleFinder";
import { GameAreaView } from "./views/GameAreaView.three";
import { GameAreaViewController } from "./controllers/GameAreaViewController";
import { GameScreenView } from "./views/GameScreenView.pixi";
import { GameScreenViewController } from "./controllers/GameScreenViewController";

const SCORE_CONTROL_ID = "score";
export { SCORE_CONTROL_ID };

/**
 * Bubble Shooter scaffold.
 *
 * Step 3 in a multi-step build: play area + empty grid + initial bubble
 * layout from earlier steps, plus a shooter at the bottom-centre that
 * holds a random-coloured bubble, rotates to track the cursor, and shows
 * a dotted aim line that reflects off the side walls and stops at the
 * top wall or the first bubble it would touch. No firing yet.
 */
export class BubbleShooterApp extends GamelabsApp {
  private readonly _assetRequestList = new AssetRequestList();
  private readonly _config = new BubbleShooterConfig();
  private readonly _layout = new BubbleGridLayout(this._config);
  private readonly _grid = new BubbleGrid(this._layout);
  private readonly _shooter = new Shooter();
  private readonly _score = new Score();
  private readonly _gameEvents = new GameEvents();
  private readonly _gameCameraBinding = new GameCameraBinding();
  private readonly _onScreenControlsBinding = new OnScreenControlsBinding();
  private readonly _uiComponentsBinding = new UIComponentsBinding();

  private _gameAreaView: GameAreaView | null = null;
  private _cameraManager: GameCameraManager | null = null;
  private _cameraController: Front2dCameraController | null = null;

  public constructor(stageEl: HTMLElement) {
    super({ mount: stageEl });
  }

  protected override registerModules(): void {
    this.addModule(this._gameCameraBinding);
    this.addModule(this._onScreenControlsBinding);
    this.addModule(this._uiComponentsBinding);
  }

  protected override configureDI(): void {
    if (!this.world) {
      this.logger.log("World is not initialized", LogTypes.Error);
      throw new Error("World is not initialized");
    }
    this.viewDiContainer.bindInstance(World, this.world);

    this.diContainer.bindInstance(BubbleShooterConfig, this._config);
    this.viewDiContainer.bindInstance(BubbleShooterConfig, this._config);
    this.diContainer.bindInstance(BubbleGridLayout, this._layout);
    this.viewDiContainer.bindInstance(BubbleGridLayout, this._layout);
    this.diContainer.bindInstance(BubbleGrid, this._grid, [IBubbleGrid]);
    this.diContainer.bindInstance(Shooter, this._shooter, [IShooter]);
    this.diContainer.bindInstance(Score, this._score, [IScore]);
    this.diContainer.bindInstance(GameEvents, this._gameEvents);

    // Top-left score readout via the on-screen-controls Label widget.
    const osc = this.diContainer.getInstance(OnScreenControlManager);
    osc.addControl({
      type: ControlType.Label,
      id: SCORE_CONTROL_ID,
      anchor: ControlAnchor.TopLeft,
      offsetX: 16,
      offsetY: 16,
      content: "Score: 0",
      text: { color: 0xffffff, fontSize: 22, fontWeight: "700" },
    });
    this.diContainer.bindSingleton(AimTrajectoryCalculator, () => new AimTrajectoryCalculator());
    this.diContainer.bindSingleton(MatchFinder, () => new MatchFinder());
    this.diContainer.bindSingleton(FloatingBubbleFinder, () => new FloatingBubbleFinder());
    this.diContainer.bindSingleton(GameOperations, () => new GameOperations());
  }

  protected override configureViews(): void {
    this.viewFactory.registerScreen(BubbleShooterUIIds.GameScreen, GameScreenView, GameScreenViewController);
    this.viewFactory.register(GameAreaView, GameAreaViewController);
  }

  protected override loadAssets(): void {
    this._assetRequestList.addRequest(
      new AssetRequest(AssetTypes.WorldTexture, BubbleShooterAssetIds.BubbleRed, new URL("../assets/bubbles/red.svg", import.meta.url).href),
    );
    this._assetRequestList.addRequest(
      new AssetRequest(AssetTypes.WorldTexture, BubbleShooterAssetIds.BubbleBlue, new URL("../assets/bubbles/blue.svg", import.meta.url).href),
    );
    this._assetRequestList.addRequest(
      new AssetRequest(AssetTypes.WorldTexture, BubbleShooterAssetIds.BubbleGreen, new URL("../assets/bubbles/green.svg", import.meta.url).href),
    );
    this._assetRequestList.addRequest(
      new AssetRequest(AssetTypes.WorldTexture, BubbleShooterAssetIds.BubbleYellow, new URL("../assets/bubbles/yellow.svg", import.meta.url).href),
    );
    this._assetRequestList.addRequest(
      new AssetRequest(AssetTypes.WorldTexture, BubbleShooterAssetIds.BubblePurple, new URL("../assets/bubbles/purple.svg", import.meta.url).href),
    );
    this._assetRequestList.addRequest(
      new AssetRequest(AssetTypes.WorldTexture, BubbleShooterAssetIds.SwapIcon, new URL("../assets/swap-icon.svg", import.meta.url).href),
    );
    this.assetManager.loadAll(this._assetRequestList.getRequests());
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
    this._cameraController.followPosition(0, 0, this._config.cameraFocusZ);
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
