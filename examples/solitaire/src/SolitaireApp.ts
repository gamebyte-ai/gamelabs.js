import { GamelabsApp, GameCameraBinding, GameCameraManager, LogTypes, Topdown2dCameraController, UIEvents } from "@gamebyte/gamelabsjs";

import { GameScreenView } from "./views/GameScreenView.pixi";
import { GameScreenViewController } from "./controllers/GameScreenViewController";
import { BoardView } from "./views/BoardView.three";
import { BoardViewController } from "./controllers/BoardViewController";

import { BoardModel } from "./models/BoardModel";
import { IBoardModel } from "./models/IBoardModel";
import { KlondikeLayoutOperations } from "./utilities/KlondikeLayoutOperations";
import { KlondikeDealOperations } from "./utilities/KlondikeDealOperations";
import { BoardBoundsCalculator } from "./utilities/BoardBoundsCalculator";
import type { IRng } from "./utilities/IRng";
import { SeededRng } from "./utilities/SeededRng";
import { MathRandomRng } from "./utilities/MathRandomRng";
import { SolitaireConfig } from "./SolitaireConfig";
import { SolitaireUIIds } from "./SolitaireUIIds";

const BOARD_PADDING = 0.6;

export class SolitaireApp extends GamelabsApp {
  private readonly _config = new SolitaireConfig();
  private readonly _gameCameraBinding = new GameCameraBinding();
  private readonly _boardModel = new BoardModel();
  private _boardView: BoardView | null = null;
  private _cameraManager: GameCameraManager | null = null;
  private _cameraController: Topdown2dCameraController | null = null;

  public constructor(stageEl: HTMLElement) {
    super({ mount: stageEl });
  }

  protected override registerModules(): void {
    this.addModule(this._gameCameraBinding);
  }

  protected override configureDI(): void {
    this.diContainer.bindInstance(SolitaireConfig, this._config);
    this.diContainer.bindInstance(BoardModel, this._boardModel, [IBoardModel]);
  }

  protected override configureViews(): void {
    this.viewFactory.registerScreen(SolitaireUIIds.GameScreen, GameScreenView, GameScreenViewController);
    this.viewFactory.register<BoardView, BoardViewController>(BoardView, BoardViewController);
  }

  protected override postInitialize(): void {
    if (!this.hud) {
      this.logger.log("HUD is not initialized", LogTypes.Error);
      throw new Error("HUD is not initialized");
    }
    if (!this.world) {
      this.logger.log("World is not initialized", LogTypes.Error);
      throw new Error("World is not initialized");
    }

    this.diContainer.getInstance(UIEvents).createScreen(SolitaireUIIds.GameScreen, this._config.transitions.gameScreenEnter);

    this._boardModel.loadLayout(KlondikeLayoutOperations.create());
    KlondikeDealOperations.deal(this._boardModel, this.createRng());

    this._cameraManager = this.diContainer.getInstance(GameCameraManager);
    this._cameraManager.initialize(this.world);
    this._cameraController = new Topdown2dCameraController(this._cameraManager).register();

    this._boardView = this.viewFactory.createView(BoardView);
    this.world.addView(this._boardView);

    this.updateCameraFit(this.width, this.height);
  }

  protected override onResize(width: number, height: number, dpr: number): void {
    super.onResize(width, height, dpr);
    this._cameraManager?.resize(width, height);
    this.updateCameraFit(width, height);
  }

  protected override onStep(timestepSeconds: number): void {
    super.onStep(timestepSeconds);
    this._cameraManager?.update(timestepSeconds);
  }

  protected override preDestroy(): void {
    this._boardView?.destroy();
    this._boardView = null;
    this._cameraController = null;
    this._cameraManager = null;
  }

  private createRng(): IRng {
    return this._config.shuffleSeed === null ? new MathRandomRng() : new SeededRng(this._config.shuffleSeed);
  }

  private updateCameraFit(viewportWidth: number, viewportHeight: number): void {
    if (!this._cameraManager || !this._cameraController) return;
    if (viewportWidth <= 0 || viewportHeight <= 0) return;
    const layout = this._boardModel.layout;
    if (!layout) return;
    const bounds = BoardBoundsCalculator.compute(layout, this._boardModel.slots);
    if (!bounds) return;

    const contentW = bounds.maxX - bounds.minX + BOARD_PADDING * 2;
    const contentH = bounds.maxZ - bounds.minZ + BOARD_PADDING * 2;
    const aspect = viewportWidth / viewportHeight;
    this._cameraManager.setOrthoSize(Math.max(contentH, contentW / aspect));

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerZ = (bounds.minZ + bounds.maxZ) / 2;
    this._cameraController.followPosition(centerX, 0, centerZ);
  }
}
