import { AssetRequest, AssetTypes, AssetRequestList, GamelabsApp, LogTypes } from "gamelabsjs";

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

  private _cubeView: CubeView | null = null;

  constructor(stageEl: HTMLElement) {
    super({ mount: stageEl, sharedContext: true });
  }

  protected override registerModules(): void {
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
  }
  
  protected override onStep(timestepSeconds: number): void {
    super.onStep(timestepSeconds);
  }

  protected override preDestroy(): void {
    this._cubeView?.destroy();
    this._cubeView = null;
  }
}

