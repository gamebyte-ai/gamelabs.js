import { GamelabsApp, MainScreenAssetIds } from "gamelabsjs";

import { MainScreenBinding, MainScreenEvents, MainScreenView } from "gamelabsjs";
import { LevelProgressScreenBinding, LevelProgressScreenView, LevelProgressScreenEvents } from "gamelabsjs";
import { LevelProgressModel } from "./models/LevelProgressModel";
import { Example02Binding } from "./Example02Bindings";

export class Example02App extends GamelabsApp {
  public readonly mainScreenBinding = new MainScreenBinding();
  public readonly levelProgressScreenBinding = new LevelProgressScreenBinding(new LevelProgressModel());
  public readonly bindings = new Example02Binding();
  private unsubscribePlayClick: (() => void) | null = null;
  private unsubscribeBackClick: (() => void) | null = null;

  constructor(stageEl: HTMLElement) {
    super({ mount: stageEl, sharedContext: true });
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

    this.viewFactory.createScreen(MainScreenView, null, this.bindings.config.transitions.mainScreenIntro);
  }

  protected override onStep(timestepSeconds: number): void {
    // Intentionally empty (template), keep base behavior consistent.
    super.onStep(timestepSeconds);
  }

  protected override registerModules(): void {
    this.mainScreenBinding.overrideAssetUrl(MainScreenAssetIds.Logo, new URL("../assets/example_logo.png", import.meta.url).href);
    this.addModule(this.mainScreenBinding);
    this.addModule(this.levelProgressScreenBinding);
    this.addModule(this.bindings);
  }

  private showLevelProgressScreen(): void {
    this.viewFactory.createScreen(LevelProgressScreenView, null, this.bindings.config.transitions.levelProgressScreenEnter);
  }

  private showMainScreen(): void {
    this.viewFactory.createScreen(MainScreenView, null, this.bindings.config.transitions.mainScreenEnter);
  }

  protected override preDestroy(): void {
    this.unsubscribePlayClick?.();
    this.unsubscribePlayClick = null;
    this.unsubscribeBackClick?.();
    this.unsubscribeBackClick = null;
  }
}

