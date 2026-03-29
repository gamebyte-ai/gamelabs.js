import { GamelabsApp, MainScreenAssetIds, UnsubscribeBag } from "gamelabsjs";

import { MainScreenBinding, MainScreenEvents, MainScreenView } from "gamelabsjs";
import { LevelProgressScreenBinding, LevelProgressScreenView, LevelProgressScreenEvents } from "gamelabsjs";
import { LevelProgressModel } from "./models/LevelProgressModel";
import { ScreensConfig } from "./ScreensConfig";

export class ScreensApp extends GamelabsApp {
  private readonly mainScreenBinding = new MainScreenBinding();
  private readonly levelProgressScreenBinding = new LevelProgressScreenBinding(new LevelProgressModel());
  private readonly config = new ScreensConfig();
  private readonly subs = new UnsubscribeBag();

  constructor(stageEl: HTMLElement) {
    super({ mount: stageEl, sharedContext: true });
  }

  protected override registerModules(): void {
    this.mainScreenBinding.assetRequestList.overrideRequestUrl(MainScreenAssetIds.Logo, new URL("../assets/example_logo.png", import.meta.url).href);
    this.addModule(this.mainScreenBinding);
    this.addModule(this.levelProgressScreenBinding);
  }

  protected override postInitialize(): void {
    const mainEvents = this.diContainer.getInstance(MainScreenEvents);
    this.subs.add(mainEvents.onPlayClick(() => {
      this.showLevelProgressScreen();
    }));

    const levelProgressEvents = this.diContainer.getInstance(LevelProgressScreenEvents);
    this.subs.add(levelProgressEvents.onBackClick(() => {
      this.showMainScreen();
    }));

    this.viewFactory.createScreenView(MainScreenView, this.config.transitions.mainScreenIntro);
  }

  protected override preDestroy(): void {
    this.subs.flush();
  }

  private showLevelProgressScreen(): void {
    this.viewFactory.createScreenView(LevelProgressScreenView, this.config.transitions.levelProgressScreenEnter);
  }

  private showMainScreen(): void {
    this.viewFactory.createScreenView(MainScreenView, this.config.transitions.mainScreenEnter);
  }

}
