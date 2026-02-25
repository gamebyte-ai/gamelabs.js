import { GamelabsApp } from "gamelabsjs";

import { MainScreenBinding, MainScreenEvents, MainScreenView } from "gamelabsjs";
import { LevelProgressScreenBinding, LevelProgressScreenView, LevelProgressScreenEvents } from "gamelabsjs";
import { Example02Config } from "./Example02Config";
import { LevelProgressModel } from "./models/LevelProgressModel";

export class Example02App extends GamelabsApp {
  public readonly config = new Example02Config();
  public readonly mainScreenBinding = new MainScreenBinding();
  public readonly levelProgressScreenBinding = new LevelProgressScreenBinding(new LevelProgressModel());
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

    this.viewFactory.createScreen(MainScreenView, null, this.config.transitions.mainScreenIntro);
  }

  protected override onStep(timestepSeconds: number): void {
    // Intentionally empty (template), keep base behavior consistent.
    super.onStep(timestepSeconds);
  }

  protected override registerModules(): void {
    this.addModule(this.mainScreenBinding);
    this.addModule(this.levelProgressScreenBinding);
  }

  private showLevelProgressScreen(): void {
    this.viewFactory.createScreen(LevelProgressScreenView, null, this.config.transitions.levelProgressScreenEnter);
  }

  private showMainScreen(): void {
    this.viewFactory.createScreen(MainScreenView, null, this.config.transitions.mainScreenEnter);
  }

  protected override preDestroy(): void {
    this.unsubscribePlayClick?.();
    this.unsubscribePlayClick = null;
    this.unsubscribeBackClick?.();
    this.unsubscribeBackClick = null;
  }
}

