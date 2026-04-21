import * as THREE from "three";
import { vector } from "@js-basics/vector";
import {
  AudioService,
  GamelabsApp,
  GameCameraBinding,
  Grid,
  GridPreset,
  LogTypes,
  Orbital3dCameraController,
  SettingsBinding,
  SettingsBooleanField,
  SettingsNumberField,
  UIEvents,
  UnsubscribeBag,
  World,
} from "@gamebyte/gamelabsjs";

import { TowerDefenseConfig } from "./TowerDefenseConfig.js";
import { TowerDefenseUIIds } from "./TowerDefenseUIIds.js";
import { TowerDefenseGameGridBinding } from "./modules/gamegrid/TowerDefenseGameGridBinding.js";
import { GameEvents } from "./events/GameEvents.js";
import { EnemyManager } from "./utilities/EnemyManager.js";
import { CombatManager } from "./utilities/CombatManager.js";
import { GameOperations } from "./utilities/GameOperations.js";
import { LevelManager } from "./utilities/LevelManager.js";
import { GameState } from "./models/GameState.js";
import { IGameState } from "./models/IGameState.js";
import { GameBoardsView } from "./modules/gamegrid/views/GameBoardsView.three.js";
import { GameSceneView } from "./views/GameSceneView.three.js";
import { GameSceneViewController } from "./controllers/GameSceneViewController.js";

import { GameScreenView } from "./views/GameScreenView.pixi.js";
import { GameScreenViewController } from "./controllers/GameScreenViewController.js";
import { GeneratingPopupView } from "./views/GeneratingPopupView.pixi.js";
import { GeneratingPopupViewController } from "./controllers/GeneratingPopupViewController.js";
import { SfxService } from "./services/SfxService.js";

/**
 * Tower defense application entry point.
 *
 * The app coordinates DI bindings and module wiring. All scene-graph
 * setup (enemy/combat containers, the base HP bar) lives in
 * {@link GameSceneView}. All domain mutations (gold, HP, tower
 * placement, level regeneration) go through {@link GameOperations}.
 * Path state and cell-type queries live on {@link LevelManager}.
 */
export class TowerDefenseApp extends GamelabsApp {
  private readonly _config = new TowerDefenseConfig();
  private readonly _level = new LevelManager();
  private readonly _gameGridBinding = new TowerDefenseGameGridBinding(this._config, this._level);
  private readonly _gameCameraBinding = new GameCameraBinding();
  private readonly _settingsBinding = new SettingsBinding();
  private readonly _events = new GameEvents();
  private readonly _gameState: GameState;
  private _orbitalController: Orbital3dCameraController | null = null;
  private readonly _followTarget = new THREE.Vector3(0, 0, 0);
  private _dragState = { isOrbiting: false, isPanning: false, lastX: 0, lastY: 0 };
  private _enemyManager: EnemyManager | null = null;
  private _combatManager: CombatManager | null = null;
  private _sceneView: GameSceneView | null = null;
  private readonly _systemUnsubs = new UnsubscribeBag();
  /**
   * Gate for all per-frame game-logic callbacks. Set to `false` during
   * level teardown so no update tick can fire on partially-torn-down
   * state. Set back to `true` only after the new level is fully built.
   */
  private _levelActive = true;
  /** True while any popup (settings, generating…) is open. Gates the
   *  raw DOM pointer/wheel handlers so they don't interact with the
   *  world scene behind the popup. */
  private _popupOpen = false;

  public constructor(stageEl: HTMLElement) {
    super({ mount: stageEl });
    this._gameState = new GameState(this._config.startingGold, this._config.baseHp);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────

  protected override registerModules(): void {
    this.addModule(this._gameCameraBinding);
    this.addModule(this._gameGridBinding);

    this._settingsBinding.addField(new SettingsBooleanField("sfx", "Sound Effects", true));
    this._settingsBinding.addField(new SettingsNumberField("sfxVolume", "SFX Volume", 80, 0, 100, 5));
    this.addModule(this._settingsBinding);
  }

  protected override configureDI(): void {
    this.diContainer.bindInstance(TowerDefenseConfig, this._config);
    this.viewDiContainer.bindInstance(TowerDefenseConfig, this._config);
    this.diContainer.bindInstance(GameEvents, this._events);

    // World is bound to viewDiContainer so GameSceneView can configure
    // the renderer (shadow maps) and replace the default lights with
    // terrain-appropriate lighting per the rule "Scene setup belongs in views".
    if (this.world) this.viewDiContainer.bindInstance(World, this.world);

    // GameState is bound under both its concrete token (used by
    // GameOperations for mutations) and the readonly IGameState token
    // (resolved by controllers and the scene view).
    this.diContainer.bindInstance(GameState, this._gameState, [IGameState]);
    this.viewDiContainer.bindInstance(IGameState, this._gameState);

    // LevelManager is shared across world-thread (App, EnemyManager) and
    // view-thread (GameBoardCellObject via creator constructor) callers.
    // bindInstance does not call inject() automatically, so we drive it
    // manually below once TowerDefenseConfig is bound.
    this.diContainer.bindInstance(LevelManager, this._level);
    this.viewDiContainer.bindInstance(LevelManager, this._level);
    this._level.inject(this.diContainer);

    // GameOperations is the only mutation surface for GameState + the
    // grid; bound as a singleton whose inject() pulls all dependencies.
    this.diContainer.bindSingleton(GameOperations, () => new GameOperations());

    // SfxService wraps AudioService for procedural game sounds.
    const audioService = this.diContainer.getInstance(AudioService);
    this.diContainer.bindInstance(SfxService, new SfxService(audioService));

    // Create the grid and register it on the model provided by GameGridBinding
    const model = this._gameGridBinding.model;
    const events = this._gameGridBinding.events;
    const preset = new GridPreset(this._config.cellSize, this._config.cellSize, vector(1, 0, 0), vector(0, 0, 1));
    const grid = new Grid(TowerDefenseConfig.GRID_ID, this._config.cols, this._config.rows, events, preset);
    model.addGrid(grid);
  }

  protected override configureViews(): void {
    this.viewFactory.registerScreen(TowerDefenseUIIds.GameScreen, GameScreenView, GameScreenViewController);
    this.viewFactory.registerPopup(TowerDefenseUIIds.GeneratingPopup, GeneratingPopupView, GeneratingPopupViewController);
    this.viewFactory.register(GameSceneView, GameSceneViewController);
  }

  protected override postInitialize(): void {
    if (!this.hud || !this.world) {
      this.logger.log("HUD or World is not initialized", LogTypes.Error);
      throw new Error("HUD or World is not initialized");
    }

    // Track popup open/close to gate raw DOM input handlers.
    const uiEvents = this.diContainer.getInstance(UIEvents);
    this._systemUnsubs.add(uiEvents.onCreatePopup(() => { this._popupOpen = true; }));
    this._systemUnsubs.add(uiEvents.onRemoveTopPopup(() => { this._popupOpen = false; }));

    // HUD screen
    uiEvents.createScreen(
      TowerDefenseUIIds.GameScreen,
      this._config.transitions.gameScreenEnter,
    );

    // Grid world view
    this.world.addView(this.viewFactory.createView(GameBoardsView));

    // Scene host view (owns enemy/combat containers + base HP bar).
    this._sceneView = this.viewFactory.createView(GameSceneView);
    this.world.addView(this._sceneView);

    // Center the grid around the origin
    const grid = this._gameGridBinding.model.getGrid(TowerDefenseConfig.GRID_ID);
    if (grid) {
      const midX = ((this._config.cols - 1) * grid.preset.columnSize) * 0.5;
      const midZ = ((this._config.rows - 1) * grid.preset.rowSize) * 0.5;
      grid.setPosition(vector(-midX, 0, -midZ));
    }

    // Camera: orbital perspective with an isometric-style starting angle
    this._gameCameraBinding.cameraManager.initialize(this.world);
    this._orbitalController = new Orbital3dCameraController(this._gameCameraBinding.cameraManager).register();
    this._orbitalController.distance = this._config.cameraDistance;
    this._orbitalController.azimuth = this._config.cameraAzimuth;
    this._orbitalController.pitch = this._config.cameraPitch;
    this._orbitalController.minDistance = this._config.cameraMinDistance;
    this._orbitalController.maxDistance = this._config.cameraMaxDistance;
    this._orbitalController.minPitch = this._config.cameraMinPitch;
    this._orbitalController.followPosition(0, 0, 0);

    // Mouse drag to orbit. Listeners go on the stage container (not the world
    // canvas) because the HUD canvas sits on top of the world canvas with a
    // higher z-index and would otherwise swallow every pointer/wheel/
    // contextmenu event before it reached the world canvas.
    const inputTarget: HTMLElement = this.mount ?? this.canvas;
    inputTarget.addEventListener("pointerdown", this._onPointerDown);
    inputTarget.addEventListener("pointermove", this._onPointerMove);
    inputTarget.addEventListener("pointerup", this._onPointerUp);
    inputTarget.addEventListener("pointercancel", this._onPointerUp);
    inputTarget.addEventListener("wheel", this._onWheel, { passive: true });

    // ESC / right-click cancel placement
    window.addEventListener("keydown", this._onKeyDown);
    inputTarget.addEventListener("contextmenu", this._onContextMenu);

    // Enemy / combat managers render into the scene view's containers,
    // not into world.scene directly. The view owns those THREE.Groups.
    this._enemyManager = new EnemyManager(this._config, this._events, this._level, this._sceneView.enemyContainer);
    const sfx = this.diContainer.getInstance(SfxService);
    this._combatManager = new CombatManager(this._config, this._events, sfx, this._enemyManager, this._sceneView.combatContainer);

    // Per-frame updates — all gated by _levelActive so no tick fires on
    // partially-torn-down state during the teardown → rebuild gap.
    const ops = this.diContainer.getInstance(GameOperations);
    this._systemUnsubs.add(this.updateManager.register((dt) => { if (this._levelActive) this._enemyManager!.update(dt); }));
    this._systemUnsubs.add(this.updateManager.register((dt) => { if (this._levelActive) this._combatManager!.update(dt); }));
    this._systemUnsubs.add(this.updateManager.register((dt) => { if (this._levelActive) ops.tickPassiveIncome(dt); }));

    // Cross-system event wiring.
    this._systemUnsubs.add(this._events.onTowerPlaced((col, row, towerType) => this._combatManager!.addTower(col, row, towerType)));
    this._systemUnsubs.add(this._events.onTeardownLevel(() => this._onTeardownLevel()));
    this._systemUnsubs.add(this._events.onLevelGenerated(() => this._onLevelReady()));
    this._systemUnsubs.add(this._events.onEnemyReachedBase((damage) => this._onEnemyReachedBase(damage)));
    this._systemUnsubs.add(this._events.onEnemyKilled((reward) => ops.addGold(reward)));
  }

  /**
   * Tear down every piece of in-flight game state that belongs to the
   * current level. `_levelActive` is flipped **first** so any update
   * tick that fires between now and the rebuild is a guaranteed no-op.
   * Then all managers are cleared so no stale state remains.
   */
  private _onTeardownLevel(): void {
    this._levelActive = false;
    this._enemyManager?.setSpawning(false);
    this._enemyManager?.clearAll();
    this._combatManager?.clearTowers();
  }

  private _onLevelReady(): void {
    this._levelActive = true;
    this._enemyManager?.setSpawning(true);
  }

  private _onEnemyReachedBase(damage: number): void {
    this.diContainer.getInstance(GameOperations).damageBase(damage);
  }

  // ── Camera controls ────────────────────────────────────────────────────
  //  Left drag  → orbit (azimuth + pitch)
  //  Right drag → pan (shift follow target in camera-relative XZ)
  //  Wheel      → zoom toward cursor

  private readonly _onPointerDown = (e: PointerEvent): void => {
    if (this._popupOpen) return;
    if (e.button === 0) {
      this._dragState.isOrbiting = true;
    } else if (e.button === 2) {
      this._dragState.isPanning = true;
    }
    this._dragState.lastX = e.clientX;
    this._dragState.lastY = e.clientY;
  };

  private readonly _onPointerMove = (e: PointerEvent): void => {
    if (this._popupOpen || !this._orbitalController) return;
    const dx = e.clientX - this._dragState.lastX;
    const dy = e.clientY - this._dragState.lastY;
    this._dragState.lastX = e.clientX;
    this._dragState.lastY = e.clientY;

    if (this._dragState.isOrbiting) {
      this._orbitalController.addAzimuth(-dx * 0.005);
      this._orbitalController.addPitch(-dy * 0.005);
    } else if (this._dragState.isPanning && this.world) {
      const cam = this.world.activeCamera;
      const dir = new THREE.Vector3();
      cam.getWorldDirection(dir);
      const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), dir).normalize();
      const forward = new THREE.Vector3(-dir.x, 0, -dir.z).normalize();
      const panSpeed = 0.001 * this._orbitalController.distance;
      this._followTarget.x -= dx * -right.x * panSpeed + dy * forward.x * panSpeed;
      this._followTarget.z -= dx * -right.z * panSpeed + dy * forward.z * panSpeed;
      this._orbitalController.followPosition(this._followTarget.x, 0, this._followTarget.z);
    }
  };

  private readonly _onPointerUp = (): void => {
    this._dragState.isOrbiting = false;
    this._dragState.isPanning = false;
  };

  private readonly _onWheel = (e: WheelEvent): void => {
    if (this._popupOpen || !this._orbitalController || !this.world) return;
    const zoomDelta = e.deltaY * 0.02;
    this._orbitalController.addDistance(zoomDelta);

    if (zoomDelta < 0) {
      const el = this.mount ?? this.canvas;
      const rect = el.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const rc = new THREE.Raycaster();
      rc.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.world.activeCamera);
      const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const hit = new THREE.Vector3();
      if (rc.ray.intersectPlane(ground, hit)) {
        this._followTarget.lerp(hit, this._config.zoomTowardCursorFactor);
        this._orbitalController.followPosition(this._followTarget.x, this._followTarget.y, this._followTarget.z);
      }
    }
  };

  private readonly _onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Escape") this._events.emitCancelPlacement();
  };

  private readonly _onContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  // ── Lifecycle (resize / step / destroy) ───────────────────────────────

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
    this._combatManager?.destroy();
    this._combatManager = null;
    this._enemyManager?.destroy();
    this._enemyManager = null;
    this._sceneView?.destroy();
    this._sceneView = null;
    const inputTarget: HTMLElement = this.mount ?? this.canvas;
    inputTarget.removeEventListener("pointerdown", this._onPointerDown);
    inputTarget.removeEventListener("pointermove", this._onPointerMove);
    inputTarget.removeEventListener("pointerup", this._onPointerUp);
    inputTarget.removeEventListener("pointercancel", this._onPointerUp);
    inputTarget.removeEventListener("wheel", this._onWheel);
    window.removeEventListener("keydown", this._onKeyDown);
    inputTarget.removeEventListener("contextmenu", this._onContextMenu);
    this._orbitalController = null;
    super.preDestroy();
  }
}
