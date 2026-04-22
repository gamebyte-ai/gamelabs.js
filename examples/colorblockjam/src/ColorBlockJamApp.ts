import {
  GamelabsApp,
  GameCameraBinding,
  LogTypes,
  Orbital3dCameraController,
  UIEvents,
  UnsubscribeBag,
  World,
} from "@gamebyte/gamelabsjs";
import { ColorBlockJamConfig } from "./ColorBlockJamConfig.js";
import { ColorBlockJamUIIds } from "./ColorBlockJamUIIds.js";
import { GameEvents } from "./events/GameEvents.js";
import { GameModel } from "./models/GameModel.js";
import { IGameModel } from "./models/IGameModel.js";
import { GameOperations } from "./utilities/GameOperations.js";
import { LevelManager } from "./utilities/LevelManager.js";
import { BoardView } from "./views/BoardView.three.js";
import { BoardViewController } from "./controllers/BoardViewController.js";
import { GameScreenView } from "./views/GameScreenView.pixi.js";
import { GameScreenViewController } from "./controllers/GameScreenViewController.js";
import { WinPopupView } from "./views/WinPopupView.pixi.js";
import { WinPopupViewController } from "./controllers/WinPopupViewController.js";

/**
 * Color Block Jam app — five hand-authored levels with increasing
 * difficulty, a win popup, and clean level progression.
 *
 * Scene (per level):
 * - A cols×rows grid on the XZ plane with colored "doors" extruded along
 *   its edges. Each door has a colour and an exact width matching the
 *   perpendicular footprint of its owning block.
 * - Between 2 and 6 colored blocks drawn from the five shape families
 *   (1×1, 1×2, 1×3, 2×2 square, 2×2 L). Blocks are plain
 *   `THREE.BoxGeometry` cuboids; no textures, no audio.
 *
 * Interaction:
 * - The `BoardView` raycasts against block meshes on pointer-down and
 *   projects pointer motion onto the grid XZ plane, reporting events
 *   in grid coordinates. The `BoardViewController` feeds float anchors
 *   through `GameOperations.clampDragStep` each frame so the block
 *   slides smoothly against obstacles; the grid edge is a hard wall,
 *   so the block cannot be pulled past an edge unless it is perfectly
 *   aligned with a matching door — in which case the exit animation
 *   auto-triggers and the block clears.
 *
 * Level progression:
 * - {@link LevelManager} owns the current level index; the win popup's
 *   "Next Level" / "Play Again" fires `GameEvents.onAdvanceLevel`, the
 *   board controller rebuilds the scene, and the HUD header refreshes
 *   via `GameEvents.onLevelChanged`.
 *
 * Modules:
 * - {@link GameCameraBinding} for the topdown camera rig.
 */
export class ColorBlockJamApp extends GamelabsApp {
  private readonly _config = new ColorBlockJamConfig();
  private readonly _gameCameraBinding = new GameCameraBinding();
  private readonly _events = new GameEvents();
  private readonly _levels = new LevelManager(this._config);
  private _boardView: BoardView | null = null;
  private readonly _systemUnsubs = new UnsubscribeBag();

  public constructor(stageEl: HTMLElement) {
    super({ mount: stageEl });
  }

  protected override registerModules(): void {
    this.addModule(this._gameCameraBinding);
  }

  protected override configureDI(): void {
    this.diContainer.bindInstance(ColorBlockJamConfig, this._config);
    this.viewDiContainer.bindInstance(ColorBlockJamConfig, this._config);
    this.diContainer.bindInstance(GameEvents, this._events);
    this.diContainer.bindInstance(LevelManager, this._levels);
    this.diContainer.bindInstance(GameModel, new GameModel(), [IGameModel]);
    this.diContainer.bindSingleton(GameOperations, () => new GameOperations());

    if (!this.world) {
      this.logger.log("World is not initialized", LogTypes.Error);
      throw new Error("World is not initialized");
    }
    this.viewDiContainer.bindInstance(World, this.world);
  }

  protected override configureViews(): void {
    this.viewFactory.registerScreen(ColorBlockJamUIIds.GameScreen, GameScreenView, GameScreenViewController);
    this.viewFactory.registerPopup(ColorBlockJamUIIds.WinPopup, WinPopupView, WinPopupViewController);
    this.viewFactory.register(BoardView, BoardViewController);
  }

  protected override postInitialize(): void {
    if (!this.world) {
      this.logger.log("World is not initialized", LogTypes.Error);
      throw new Error("World is not initialized");
    }

    this.diContainer
      .getInstance(UIEvents)
      .createScreen(ColorBlockJamUIIds.GameScreen, this._config.transitions.gameScreenEnter);

    this._boardView = this.viewFactory.createView(BoardView);
    this.world.addView(this._boardView);

    this._gameCameraBinding.cameraManager.initialize(this.world);
    // Orbital 3D camera driven entirely from `ColorBlockJamConfig` —
    // tweak `cameraDistance` / `cameraPitch` / `cameraAzimuth` / focus
    // to reframe the grid without touching this file.
    const camera = new Orbital3dCameraController(this._gameCameraBinding.cameraManager).register();
    camera.distance = this._config.cameraDistance;
    camera.pitch = this._config.cameraPitch;
    camera.azimuth = this._config.cameraAzimuth;
    camera.followPosition(this._config.cameraFocusX, this._config.cameraFocusY, this._config.cameraFocusZ);
    // Re-centre the camera whenever the grid dimensions change — the
    // grid is rendered centred on (0, 0) regardless of cols/rows, so
    // the focus point usually doesn't actually move, but this guards
    // against future layout changes that shift the grid origin.
    this._systemUnsubs.add(
      this._events.onLevelChanged(() =>
        camera.followPosition(this._config.cameraFocusX, this._config.cameraFocusY, this._config.cameraFocusZ),
      ),
    );
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
    this._systemUnsubs.flush();
    this._boardView?.destroy();
    this._boardView = null;
    super.preDestroy();
  }
}
