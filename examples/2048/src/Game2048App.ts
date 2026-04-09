import { vector } from "@js-basics/vector";
import { AssetTypes, GamelabsApp, GameCameraBinding, Grid, GridEvents, GridPreset, GridsModel, LogTypes, Topdown2dCameraController, UIEvents, SettingsBinding, SettingsBooleanField, SettingsNumberField } from "gamelabsjs";
import { Game2048AssetIds } from "./Game2048AssetIds.js";
import { Game2048Config } from "./Game2048Config.js";
import { Game2048GameGridBinding } from "./Game2048GameGridBinding.js";
import { GameScreenController } from "./controllers/GameScreenController.js";
import { Game2048GridService } from "./utilities/Game2048GridService.js";
import { GameEvents } from "./events/GameEvents.js";
import { GameScreenView } from "./views/GameScreenView.pixi.js";
import { GameBoardsView } from "./views/GameBoardsView.three.js";
import { Game2048UIIds } from "./Game2048UIIds.js";

export class Game2048App extends GamelabsApp {
  private readonly _config = new Game2048Config();
  private readonly _gameGridBinding = new Game2048GameGridBinding();
  private readonly _gameCameraBinding = new GameCameraBinding();
  private readonly _settingsBinding = new SettingsBinding();
  private readonly _gameEvents = new GameEvents();
  private _cameraController: Topdown2dCameraController | null = null;

  public constructor(stageEl: HTMLElement) {
    super({ mount: stageEl, sharedContext: true });
  }

  protected override registerModules(): void {
    this.addModule(this._gameCameraBinding);
    this.addModule(this._gameGridBinding);

    this._settingsBinding.addField(new SettingsBooleanField("sfx", "Sound Effects", true));
    this._settingsBinding.addField(new SettingsNumberField("sfxVolume", "SFX Volume", 100, 0, 100, 5));
    this.addModule(this._settingsBinding);
  }

  protected override configureDI(): void {
    this.diContainer.bindInstance(Game2048Config, this._config);
    this.viewDiContainer.bindInstance(Game2048Config, this._config);
    this.diContainer.bindInstance(GameEvents, this._gameEvents);
    this.diContainer.bindSingleton(Game2048GridService, (resolver) => {
      const model = resolver.getInstance(GridsModel);
      const config = resolver.getInstance(Game2048Config);
      const events = resolver.getInstance(GridEvents);
      const preset = new GridPreset(config.gridColumnSize, config.gridRowSize, vector(1, 0, 0), vector(0, 0, 1));
      const grid = new Grid(Game2048Config.GRID_ID, config.cols, config.rows, events, preset);
      model.addGrid(grid);
      const svc = new Game2048GridService(grid, config);
      svc.inject(resolver);
      return svc;
    });
  }

  protected override loadAssets(): void {
    this.assetManager.load(AssetTypes.Audio, Game2048AssetIds.SfxMove, new URL("../assets/sfx_move.wav", import.meta.url).href);
    this.assetManager.load(AssetTypes.Audio, Game2048AssetIds.SfxMerge, new URL("../assets/sfx_merge.wav", import.meta.url).href);
    this.assetManager.load(AssetTypes.Audio, Game2048AssetIds.SfxInvalid, new URL("../assets/sfx_invalid.wav", import.meta.url).href);
    this.assetManager.load(AssetTypes.Audio, Game2048AssetIds.SfxSpawn, new URL("../assets/sfx_spawn.wav", import.meta.url).href);
  }

  protected override configureViews(): void {
    this.viewFactory.registerScreen(Game2048UIIds.GameScreen, GameScreenView, GameScreenController);
  }

  protected override postInitialize(): void {
    if (!this.hud || !this.world) {
      this.logger.log("HUD or world is not initialized", LogTypes.Error);
      throw new Error("HUD or world is not initialized");
    }
    this.diContainer.getInstance(UIEvents).createScreen(Game2048UIIds.GameScreen, this._config.transitions.gameScreenEnter);
    this.world.addView(this.viewFactory.createView(GameBoardsView));

    const grid = this._gameGridBinding.model.getGrid(Game2048Config.GRID_ID);
    if (grid) {
      const midX = ((this._config.cols - 1) * grid.preset.columnSize) * 0.5;
      const midZ = ((this._config.rows - 1) * grid.preset.rowSize) * 0.5;
      grid.setPosition(vector(-midX, 0, -midZ));
    }
    this._gameCameraBinding.cameraManager.initialize(this.world);
    this._cameraController = new Topdown2dCameraController(this._gameCameraBinding.cameraManager);
    this._cameraController.followPosition(0, 0, 0);
    this._fitOrthoToBoard(this.width, this.height);
  }

  protected override onResize(width: number, height: number, dpr: number): void {
    super.onResize(width, height, dpr);
    this._gameCameraBinding.cameraManager.resize(width, height);
    this._fitOrthoToBoard(width, height);
  }

  /** Pick an orthographic size that always leaves `boardMargin` world units
   *  free on every side of the board, in both axes. With aspect = w / h and
   *  ortho conventions `visible_h = orthoSize`, `visible_w = orthoSize * aspect`,
   *  we need both spans to be at least `boardSpan + 2 * margin`. */
  private _fitOrthoToBoard(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;
    const aspect = width / height;
    const boardWidth = this._config.cols * this._config.gridColumnSize;
    const boardHeight = this._config.rows * this._config.gridRowSize;
    const requiredW = boardWidth + 2 * this._config.boardMargin;
    const requiredH = boardHeight + 2 * this._config.boardMargin;
    const orthoForHeight = requiredH;
    const orthoForWidth = requiredW / aspect;
    const orthoSize = Math.max(orthoForHeight, orthoForWidth);
    this._gameCameraBinding.cameraManager.setOrthoSize(orthoSize);
  }

  protected override onStep(timestepSeconds: number): void {
    super.onStep(timestepSeconds);
    this._gameCameraBinding.cameraManager.update(timestepSeconds);
  }

  protected override preDestroy(): void {
    this._cameraController = null;
    super.preDestroy();
  }
}
