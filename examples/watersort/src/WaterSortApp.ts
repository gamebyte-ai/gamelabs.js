import { GamelabsApp, UIEvents, AssetRequest, AssetTypes, AssetRequestList } from "gamelabsjs";

import { GameScreenView } from "./views/GameScreenView.pixi";
import { GameScreenController } from "./controllers/GameScreenController";
import { WinPopupView } from "./views/WinPopupView.pixi";
import { WinPopupController } from "./controllers/WinPopupController";

import { GameEvents } from "./events/GameEvents";
import { WaterSortConfig } from "./WaterSortConfig";
import { WaterSortUIIds } from "./WaterSortUIIds";
import { WaterSortAssetIds } from "./WaterSortAssetIds";
import { WaterSortOperations } from "./utilities/WaterSortOperations";

export class WaterSortApp extends GamelabsApp {
  private readonly _config = new WaterSortConfig();
  private readonly _gameEvents = new GameEvents();
  private readonly _assetRequestList = new AssetRequestList();

  constructor(stageEl: HTMLElement) {
    super({ mount: stageEl, sharedContext: true });
  }

  protected override configureDI(): void {
    this.diContainer.bindInstance(WaterSortConfig, this._config);
    this.viewDiContainer.bindInstance(WaterSortConfig, this._config);
    this.diContainer.bindInstance(GameEvents, this._gameEvents);

    const ops = new WaterSortOperations(this._config);
    this.diContainer.bindInstance(WaterSortOperations, ops);
  }

  protected override configureViews(): void {
    this.viewFactory.registerScreen(WaterSortUIIds.GameScreen, GameScreenView, GameScreenController);
    this.viewFactory.registerPopup(WaterSortUIIds.WinPopup, WinPopupView, WinPopupController);
  }

  protected override loadAssets(): void {
    this._assetRequestList.addRequest(new AssetRequest(AssetTypes.HudTexture, WaterSortAssetIds.Background, new URL("../assets/background.png", import.meta.url).href));
    this._assetRequestList.addRequest(new AssetRequest(AssetTypes.HudTexture, WaterSortAssetIds.Bottle, new URL("../assets/bottle.png", import.meta.url).href));
    this._assetRequestList.addRequest(new AssetRequest(AssetTypes.HudTexture, WaterSortAssetIds.BottleShine, new URL("../assets/bottle_shine.png", import.meta.url).href));
    this._assetRequestList.addRequest(new AssetRequest(AssetTypes.HudTexture, WaterSortAssetIds.Star, new URL("../assets/star.png", import.meta.url).href));
    this.assetManager.loadAll(this._assetRequestList.getRequests());
  }

  protected override postInitialize(): void {
    this.diContainer.getInstance(UIEvents).createScreen(WaterSortUIIds.GameScreen, this._config.transitions.gameScreenEnter);
  }
}
