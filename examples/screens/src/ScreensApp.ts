import { GamelabsApp, MainScreenAssetIds } from "gamelabsjs";

import { MainScreenBinding, MainScreenEvents, MainScreenView } from "gamelabsjs";
import { LevelProgressScreenBinding, LevelProgressScreenView, LevelProgressScreenEvents } from "gamelabsjs";
import { LevelProgressModel } from "./models/LevelProgressModel";
import { ScreensConfig } from "./ScreensConfig";

export class ScreensApp extends GamelabsApp {
  private readonly mainScreenBinding = new MainScreenBinding();
  private readonly levelProgressScreenBinding = new LevelProgressScreenBinding(new LevelProgressModel());
  private readonly config = new ScreensConfig();
  private unsubscribePlayClick: (() => void) | null = null;
  private unsubscribeBackClick: (() => void) | null = null;

  constructor(stageEl: HTMLElement) {
    super({ mount: stageEl, sharedContext: true });
  }

  protected override registerModules(): void {
    this.mainScreenBinding.assetRequestList.overrideRequestUrl(MainScreenAssetIds.Logo, new URL("../assets/example_logo.png", import.meta.url).href);
    this.addModule(this.mainScreenBinding);
    this.addModule(this.levelProgressScreenBinding);
  }

  protected override loadAssets(): void {
  }

  protected override postInitialize(): void {
    const mainEvents = this.diContainer.getInstance(MainScreenEvents);
    this.unsubscribePlayClick = mainEvents.onPlayClick(() => {
      this.showLevelProgressScreen();
    });

    const levelProgressEvents = this.diContainer.getInstance(LevelProgressScreenEvents);
    this.unsubscribeBackClick = levelProgressEvents.onBackClick(() => {
      this.showMainScreen();
    });

    this.viewFactory.createScreenView(MainScreenView, this.config.transitions.mainScreenIntro);
  }

  protected override onStep(timestepSeconds: number): void {
    super.onStep(timestepSeconds);
  }

  protected override preDestroy(): void {
    this.unsubscribePlayClick?.();
    this.unsubscribePlayClick = null;
    this.unsubscribeBackClick?.();
    this.unsubscribeBackClick = null;
  }

  private showLevelProgressScreen(): void {
    this.viewFactory.createScreenView(LevelProgressScreenView, this.config.transitions.levelProgressScreenEnter);
  }

  private showMainScreen(): void {
    this.viewFactory.createScreenView(MainScreenView, this.config.transitions.mainScreenEnter);
  }

}
