import {
  GamelabsApp,
  GameCameraBinding,
  GameCameraManager,
  GridsModel,
  GridsView,
  LogTypes,
  RectGrid,
  Topdown2dCameraController,
  UIComponentsBinding,
  UIEvents,
  GridEvents,
} from "@gamebyte/gamelabsjs";
import { BlockPuzzleConfig } from "./BlockPuzzleConfig";
import { BlockPuzzleUIIds } from "./BlockPuzzleUIIds";
import { BlockPuzzleGameGridBinding } from "./modules/gamegrid/BlockPuzzleGameGridBinding";
import { GameScreenView } from "./views/GameScreenView.pixi";
import { GameScreenViewController } from "./controllers/GameScreenViewController";
import { BoardLayoutCalculator, type BoardLayout } from "./utilities/BoardLayoutCalculator";
import { PieceSpawnOperations } from "./utilities/PieceSpawnOperations";

/**
 * Block Puzzle app — wires the static grid + tray layout (step 1) and
 * the initial 3-piece hand spawn (step 2).
 *
 * Modules:
 * - {@link GameCameraBinding} — top-down 2D camera; ortho size fits
 *   the combined grid + tray content with `boardMargin` headroom.
 * - {@link BlockPuzzleGameGridBinding} — extends `GameGridBinding` to
 *   render cells with the configured per-surface palettes and to
 *   render pieces via shape-driven block visuals.
 * - {@link UIComponentsBinding} — provides the Label / Button style
 *   entries the HUD reads.
 *
 * Scene:
 * - One `RectGrid` registered as `boardIds.grid` (the playing grid,
 *   8×8 by default) and one registered as `boardIds.tray` (a 1×K row
 *   of slots, K=3 by default). Both flow through `GridsModel` →
 *   `GameBoardsViewController` → `GridsView`.
 * - On game start, {@link PieceSpawnOperations.dealInitialHand}
 *   picks K pieces uniformly from `BlockPuzzleConfig.pieceTypes` and
 *   places one in each tray slot. The framework auto-renders each
 *   spawned piece via the `onItemAdded` path.
 *
 * Seams left unwired in this step:
 * - {@link ISpawnSource} (where the next piece comes from — tray
 *   today, falling-piece later) lives in `utilities/`.
 * - {@link IClearRule} (which cells clear after a placement — full
 *   row/column today, region/colour-match later) lives in
 *   `utilities/`.
 */
export class BlockPuzzleApp extends GamelabsApp {
  private readonly _config = new BlockPuzzleConfig();
  private readonly _gameCameraBinding = new GameCameraBinding();
  private readonly _gameGridBinding = new BlockPuzzleGameGridBinding(this._config);
  private readonly _uiComponentsBinding = new UIComponentsBinding();
  private _cameraController: Topdown2dCameraController | null = null;
  private _cameraManager: GameCameraManager | null = null;
  private _layout: BoardLayout | null = null;
  // Monotonic counter threaded through every spawn so item ids stay
  // unique for the lifetime of the run (refill in later steps reads
  // this back). One id is consumed per spawned piece.
  private _nextItemId = 1;

  public constructor(stageEl: HTMLElement) {
    super({ mount: stageEl });
  }

  protected override registerModules(): void {
    this.addModule(this._gameCameraBinding);
    this.addModule(this._gameGridBinding);
    this.addModule(this._uiComponentsBinding);
  }

  protected override configureDI(): void {
    this.diContainer.bindInstance(BlockPuzzleConfig, this._config);
    this.viewDiContainer.bindInstance(BlockPuzzleConfig, this._config);
  }

  protected override configureViews(): void {
    this.viewFactory.registerScreen(BlockPuzzleUIIds.GameScreen, GameScreenView, GameScreenViewController);
  }

  protected override postInitialize(): void {
    if (!this.hud || !this.world) {
      this.logger.log("HUD or world is not initialized", LogTypes.Error);
      throw new Error("HUD or world is not initialized");
    }

    this.diContainer.getInstance(UIEvents).createScreen(BlockPuzzleUIIds.GameScreen, this._config.transitions.gameScreenEnter);

    this._layout = BoardLayoutCalculator.compute(this._config);

    // Instantiate the framework-provided world view first. The
    // matching `GridsViewController` (also registered by
    // `GameGridBinding`) subscribes to `GridEvents` during its
    // `initialize` so subsequent `addGrid` calls auto-sync into the
    // scene. Module registration alone only registers the pair with
    // the view factory — nothing renders until the app constructs
    // the view here.
    this.world.addView(this.viewFactory.createView(GridsView));

    // Build + register both grids. They share `GridEvents` /
    // `GridsModel`; the controller's `onGridAdded` handler creates
    // the corresponding `GridObject` (and its cell visuals) in the
    // world view above.
    const gridEvents = this.diContainer.getInstance(GridEvents);
    const gridsModel = this.diContainer.getInstance(GridsModel);

    const playingGrid = new RectGrid(this._config.boardIds.grid, BoardLayoutCalculator.makeGridPreset(this._config), gridEvents);
    playingGrid.setPosition(this._layout.gridPosition);
    gridsModel.addGrid(playingGrid);

    const tray = new RectGrid(this._config.boardIds.tray, BoardLayoutCalculator.makeTrayPreset(this._config), gridEvents);
    tray.setPosition(this._layout.trayPosition);
    gridsModel.addGrid(tray);

    this._nextItemId = PieceSpawnOperations.dealInitialHand(tray, this._config.pieceTypes, this._config.blockColors, this._nextItemId);

    this._cameraManager = this.diContainer.getInstance(GameCameraManager);
    this._cameraManager.initialize(this.world);
    this._cameraController = new Topdown2dCameraController(this._cameraManager).register();
    this._cameraController.followPosition(0, 0, 0);
    this._fitOrthoToBoard(this.width, this.height);
  }

  protected override onResize(width: number, height: number, dpr: number): void {
    super.onResize(width, height, dpr);
    this._cameraManager?.resize(width, height);
    this._fitOrthoToBoard(width, height);
  }

  protected override onStep(timestepSeconds: number): void {
    super.onStep(timestepSeconds);
    this._cameraManager?.update(timestepSeconds);
  }

  protected override preDestroy(): void {
    this._cameraController = null;
    this._cameraManager = null;
    super.preDestroy();
  }

  /**
   * Pick an orthographic size that always leaves `boardMargin` world
   * units free on every side of the combined grid + tray block, in
   * both axes. Same pattern as `Game2048App._fitOrthoToBoard`.
   */
  private _fitOrthoToBoard(viewportWidth: number, viewportHeight: number): void {
    if (!this._cameraManager || !this._layout) return;
    if (viewportWidth <= 0 || viewportHeight <= 0) return;
    const aspect = viewportWidth / viewportHeight;
    const requiredW = this._layout.contentWidth + 2 * this._config.boardMargin;
    const requiredH = this._layout.contentHeight + 2 * this._config.boardMargin;
    const orthoForHeight = requiredH;
    const orthoForWidth = requiredW / aspect;
    this._cameraManager.setOrthoSize(Math.max(orthoForHeight, orthoForWidth));
  }
}
