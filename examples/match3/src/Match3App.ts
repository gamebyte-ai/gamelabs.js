import { vector } from "@js-basics/vector";
import { GamelabsApp, GameCameraBinding, Grid, GridEvents, GridPreset, GridsModel, LogTypes, Topdown2dCameraController } from "gamelabsjs";
import { Match3Config } from "./Match3Config.js";
import { Match3GameGridBinding } from "./Match3GameGridBinding.js";
import { Match3HudController } from "./controllers/Match3HudController.js";
import { Match3GridService } from "./services/Match3GridService.js";
import { Match3HudSignals } from "./services/Match3HudSignals.js";
import { GameScreenView } from "./views/GameScreenView.pixi.js";
import { Match3GridsView } from "./views/Match3GridsView.three.js";

export class Match3App extends GamelabsApp {
  private readonly _config = new Match3Config();
  private readonly _gameGridBinding = new Match3GameGridBinding();
  private readonly _gameCameraBinding = new GameCameraBinding();
  private readonly _hudSignals = new Match3HudSignals();
  private _cameraController: Topdown2dCameraController | null = null;

  public constructor(stageEl: HTMLElement) {
    super({ mount: stageEl, sharedContext: true });
  }

  protected override registerModules(): void {
    this.addModule(this._gameCameraBinding);
    this.addModule(this._gameGridBinding);
  }

  protected override configureDI(): void {
    this.diContainer.bindInstance(Match3Config, this._config);
    this.viewDiContainer.bindInstance(Match3Config, this._config);
    this.diContainer.bindInstance(Match3HudSignals, this._hudSignals);
    this.diContainer.bindSingleton(Match3GridService, (resolver) => {
      const model = resolver.getInstance(GridsModel);
      const config = resolver.getInstance(Match3Config);
      const events = resolver.getInstance(GridEvents);
      const preset = new GridPreset(config.gridColumnSize, config.gridRowSize, vector(1, 0, 0), vector(0, 0, 1));
      const grid = new Grid(Match3Config.GRID_ID, config.cols, config.rows, events, preset);
      model.addGrid(grid);
      const svc = new Match3GridService(grid, config);
      svc.inject(resolver);
      return svc;
    });
  }

  protected override configureViews(): void {
    this.viewFactory.registerHudView<GameScreenView, Match3HudController>(GameScreenView, { Controller: Match3HudController });
  }

  protected override postInitialize(): void {
    if (!this.hud || !this.world) {
      this.logger.log("HUD or world is not initialized", LogTypes.Error);
      throw new Error("HUD or world is not initialized");
    }
    this.viewFactory.createScreen2(GameScreenView, this._config.transitions.gameScreenEnter);
    this.world.addView(this.viewFactory.createView2(Match3GridsView));
    
    const grid = this._gameGridBinding.model.getGrid(Match3Config.GRID_ID);
    if (grid) {
      const midX = ((this._config.cols - 1) * grid.preset.columnSize) * 0.5;
      const midZ = ((this._config.rows - 1) * grid.preset.rowSize) * 0.5;
      grid.setPosition(vector(-midX, 0, -midZ));
    }
    this._gameCameraBinding.cameraManager.initialize(this.world);
    this._cameraController = new Topdown2dCameraController(this._gameCameraBinding.cameraManager);
    this._gameCameraBinding.cameraManager.setOrthoSize(this._config.cameraOrthoSize);
    this._cameraController.followPosition(0, 0, 0);
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
    super.preDestroy();
  }
}
