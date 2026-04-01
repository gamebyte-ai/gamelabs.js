import { GamelabsApp, LogTypes, GameCameraBinding, Topdown3dCameraController, IViewFactory, UIEvents } from "gamelabsjs";
import { TicTacToeTurnManager, TicTacToeTurnManagerToken } from "./utilities/TicTacToeTurnManager";
import { TurnEvents } from "./events/TurnEvents";
import { GameScreenView } from "./views/GameScreenView.pixi";
import { GameScreenController } from "./controllers/GameScreenController";
import { GridOperations } from "./utilities/GridOperations";
import { TicTacToeConfig } from "./TicTacToeConfig";
import { TicTacToeGameGridBinding } from "./TicTacToeGameGridBinding";
import { GameGridsView } from "./views/GameGridsView.three";

export class TicTacToeApp extends GamelabsApp {
  private readonly _config = new TicTacToeConfig();
  private readonly _gameCameraBinding = new GameCameraBinding();
  private readonly _gameGridBinding = new TicTacToeGameGridBinding();
  private _gameGridView: GameGridsView | null = null;
  private _cameraController: Topdown3dCameraController | null = null;

  constructor(stageEl: HTMLElement) {
    super({ mount: stageEl, sharedContext: true });
  }

  protected override registerModules(): void {
    this.addModule(this._gameCameraBinding);
    this.addModule(this._gameGridBinding);
  }

  protected override configureDI(): void {
    this.diContainer.bindInstance(TicTacToeConfig, this._config);
    this.diContainer.bindInstance(IViewFactory, this.viewFactory);
    this.diContainer.bindInstance(TurnEvents, new TurnEvents());
    this.diContainer.bindSingleton(GridOperations, (resolver) => new GridOperations());
    this.diContainer.bindSingleton(TicTacToeTurnManagerToken, (resolver) => {
      const tm = new TicTacToeTurnManager();
      tm.inject(resolver);
      return tm;
    });
  }

  protected override configureViews(): void {
    this.viewFactory.registerScreen<GameScreenView, GameScreenController>(GameScreenView, GameScreenController);
  }

  protected override postInitialize(): void {
    if (!this.hud) {
      this.logger.log("HUD is not initialized", LogTypes.Error);
      throw new Error("HUD is not initialized");
    }

    this.diContainer.getInstance(UIEvents).createScreen(GameScreenView, this._config.transitions.gameScreenEnter);

    if (!this.world) {
      this.logger.log("Three world is not initialized", LogTypes.Error);
      throw new Error("Three world is not initialized");
    }

    const gridOps = this.diContainer.getInstance(GridOperations);
    gridOps.createGrid();
    this._gameGridView = this.viewFactory.createView(GameGridsView);
    this.world.addView(this._gameGridView);

    this._gameGridBinding.model.getGrid(this._config.boardId);

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
