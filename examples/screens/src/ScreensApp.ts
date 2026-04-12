import { GamelabsApp, MainScreenAssetIds, UnsubscribeBag, UIEvents, UIUtils } from "@gamebyte/gamelabsjs";

import { MainScreenBinding, MainScreenEvents, MainScreenUIIds } from "@gamebyte/gamelabsjs";
import { LevelProgressScreenBinding, LevelProgressScreenEvents, LevelProgressScreenUIIds } from "@gamebyte/gamelabsjs";
import { LevelProgressModel } from "./models/LevelProgressModel";
import { ScreensConfig } from "./ScreensConfig";

export class ScreensApp extends GamelabsApp {
  private readonly mainScreenBinding = new MainScreenBinding();
  private readonly levelProgressScreenBinding = new LevelProgressScreenBinding(new LevelProgressModel());
  private readonly config = new ScreensConfig();
  private readonly subs = new UnsubscribeBag();

  constructor(stageEl: HTMLElement) {
    super({ mount: stageEl });
  }

  protected override registerModules(): void {
    this.mainScreenBinding.assetRequestList.overrideRequest(MainScreenAssetIds.Logo, new URL("../assets/example_logo.png", import.meta.url).href);

    const playPresetReq = this.mainScreenBinding.assetRequestList.getRequest(MainScreenAssetIds.PlayButtonPreset);
    if (playPresetReq) {
      const base = playPresetReq.content as string;
      const parsed = JSON.parse(base);
      const updated = UIUtils.updateFields(base, JSON.stringify({ width: parsed.width + 50 }));
      this.mainScreenBinding.assetRequestList.overrideRequest(MainScreenAssetIds.PlayButtonPreset, "", updated);
    }

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

    this.diContainer.getInstance(UIEvents).createScreen(MainScreenUIIds.MainScreen, this.config.transitions.mainScreenIntro);
  }

  protected override preDestroy(): void {
    this.subs.flush();
  }

  private showLevelProgressScreen(): void {
    this.diContainer.getInstance(UIEvents).createScreen(LevelProgressScreenUIIds.LevelProgressScreen, this.config.transitions.levelProgressScreenEnter);
  }

  private showMainScreen(): void {
    this.diContainer.getInstance(UIEvents).createScreen(MainScreenUIIds.MainScreen, this.config.transitions.mainScreenEnter);
  }

}
