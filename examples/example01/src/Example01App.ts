import { AssetRequest, AssetTypes, AssetRequestList, GamelabsApp, LogTypes, GameCameraBinding, Orbital3dCameraController } from "gamelabsjs";

import { CubeView } from "./views/CubeView.three";
import { CubeController } from "./controllers/CubeController";

import { GameScreenView } from "./views/GameScreenView.pixi";
import { GameScreenController } from "./controllers/GameScreenViewController";

import { TopBarView } from "./views/TopBarView.pixi";
import { TopBarController } from "./controllers/TopBarController";

import { DebugBarView } from "./views/DebugBarView.pixi";
import { DebugBarController } from "./controllers/DebugBarController";

import { DebugEvents } from "./events/DebugEvents";
import { GameEvents } from "./events/GameEvents";

import { Example01Config } from "./Example01Config";
import { Example01AssetIds } from "./Example01AssetIds";

export class Example01App extends GamelabsApp {
  
  private readonly assetRequestList = new AssetRequestList();
  private readonly config = new Example01Config();
  private readonly gameEvents = new GameEvents();
  private readonly debugEvents = new DebugEvents();
  private readonly _gameCameraBinding = new GameCameraBinding();

  private _cubeView: CubeView | null = null;
  private _orbitalController: Orbital3dCameraController | null = null;
  private _orbitalDragState = { isDragging: false, lastX: 0, lastY: 0 };

  constructor(stageEl: HTMLElement) {
    super({ mount: stageEl, sharedContext: true });
  }

  protected override registerModules(): void {
    this.addModule(this._gameCameraBinding);
  }
  
  protected override configureDI(): void {
    this.diContainer.bindInstance(Example01Config, this.config);
    this.diContainer.bindInstance(GameEvents, this.gameEvents);
    this.diContainer.bindInstance(DebugEvents, this.debugEvents);
  }

  protected override configureViews(): void {
    this.viewFactory.registerHudView<GameScreenView, GameScreenController> (GameScreenView, { Controller: GameScreenController });
    this.viewFactory.registerHudView<TopBarView,     TopBarController>     (TopBarView,     { Controller: TopBarController     });
    this.viewFactory.registerHudView<DebugBarView,   DebugBarController>   (DebugBarView,   { Controller: DebugBarController   });

    this.viewFactory.registerWorldView<CubeView, CubeController>(CubeView, { Controller: CubeController });
  }

  protected override loadAssets(): void {
    this.assetRequestList.addRequest(new AssetRequest(AssetTypes.GLTF, Example01AssetIds.Cube, new URL("../assets/cube.glb", import.meta.url).href));
    this.assetLoader.loadAll(this.assetRequestList.getRequests());
  }

  protected override postInitialize(): void {
    this.devUtils.logger.log("Creating game screen");
    if (!this.hud) {
      this.logger.log("HUD is not initialized", LogTypes.Error);
      throw new Error("HUD is not initialized");
    }

    this.viewFactory.createScreen(GameScreenView, null, this.config.transitions.gameScreenEnter);
    
    this.devUtils.logger.log("Creating cube");
    if (!this.world) {
      this.logger.log("Three world is not initialized", LogTypes.Error);
      throw new Error("Three world is not initialized");
    }

    this._cubeView = this.viewFactory.createView(CubeView, null);

    this._gameCameraBinding.cameraManager.initialize(this.world);
    this._orbitalController = new Orbital3dCameraController(this._gameCameraBinding.cameraManager);
    this._gameCameraBinding.cameraManager.followObject(this._cubeView, 8);

    const canvas = this.canvas;
    canvas.addEventListener("pointerdown", this._onOrbitalPointerDown);
    canvas.addEventListener("pointermove", this._onOrbitalPointerMove);
    canvas.addEventListener("pointerup", this._onOrbitalPointerUp);
    canvas.addEventListener("pointercancel", this._onOrbitalPointerUp);
    canvas.addEventListener("wheel", this._onOrbitalWheel, { passive: true });
  }

  private readonly _onOrbitalPointerDown = (e: PointerEvent): void => {
    this._orbitalDragState.isDragging = true;
    this._orbitalDragState.lastX = e.clientX;
    this._orbitalDragState.lastY = e.clientY;
    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
  };

  private readonly _onOrbitalPointerMove = (e: PointerEvent): void => {
    if (!this._orbitalDragState.isDragging || !this._orbitalController) return;
    const dx = (e.clientX - this._orbitalDragState.lastX) * 0.005;
    const dy = (e.clientY - this._orbitalDragState.lastY) * 0.005;
    this._orbitalController.addAzimuth(-dx);
    this._orbitalController.addPitch(dy);
    this._orbitalDragState.lastX = e.clientX;
    this._orbitalDragState.lastY = e.clientY;
  };

  private readonly _onOrbitalPointerUp = (): void => {
    this._orbitalDragState.isDragging = false;
  };

  private readonly _onOrbitalWheel = (e: WheelEvent): void => {
    this._orbitalController?.addDistance(e.deltaY * 0.01);
  };

  protected override onResize(width: number, height: number, dpr: number): void {
    super.onResize(width, height, dpr);
    this._gameCameraBinding.cameraManager.resize(width, height);
  }

  protected override onStep(timestepSeconds: number): void {
    super.onStep(timestepSeconds);
    this._gameCameraBinding.cameraManager.update(timestepSeconds);
  }

  protected override preDestroy(): void {
    const canvas = this.canvas;
    canvas.removeEventListener("pointerdown", this._onOrbitalPointerDown);
    canvas.removeEventListener("pointermove", this._onOrbitalPointerMove);
    canvas.removeEventListener("pointerup", this._onOrbitalPointerUp);
    canvas.removeEventListener("pointercancel", this._onOrbitalPointerUp);
    canvas.removeEventListener("wheel", this._onOrbitalWheel);

    this._orbitalController = null;
    this._cubeView?.destroy();
    this._cubeView = null;
  }
}

