import { GamelabsApp } from "gamelabsjs";

import { MainScreenView, MainScreenController, MainScreenEvents } from "../modules/mainscreen/src/index.js";
import {
  LevelProgressScreenView,
  LevelProgressScreenController,
  LevelProgressScreenEvents
} from "../modules/levelprogressscreeen/src/index.js";
import { AppConfig } from "./AppConfig";

export class Example02App extends GamelabsApp {
  readonly config = new AppConfig();
  private unsubscribePlayClick: (() => void) | null = null;
  private unsubscribeBackClick: (() => void) | null = null;

  constructor(stageEl: HTMLElement) {
    super({ mount: stageEl, sharedContext: true });
  }

  protected override postInitialize(): void {
    this.createGroundGrid();
    this.hud?.showStats(true);
    this.createMainScreen();

    const mainEvents = this.di.getInstance(MainScreenEvents);
    this.unsubscribePlayClick = mainEvents.onPlayClick(() => {
      this.showLevelProgressScreen();
    });

    const levelProgressEvents = this.di.getInstance(LevelProgressScreenEvents);
    this.unsubscribeBackClick = levelProgressEvents.onBackClick(() => {
      this.showMainScreen();
    });
  }

  protected override onStep(timestepSeconds: number): void {
    // Intentionally empty (template), keep base behavior consistent.
    super.onStep(timestepSeconds);
  }

  protected override configureDI(): void {
    this.di.bindInstance(MainScreenEvents, new MainScreenEvents());
    this.di.bindInstance(LevelProgressScreenEvents, new LevelProgressScreenEvents());
  }

  protected override configureViews(): void {
    this.viewFactory.register<MainScreenView, MainScreenController>(MainScreenView, {
      Controller: MainScreenController,
      attachToParent: this.attachToHud
    });

    this.viewFactory.register<LevelProgressScreenView, LevelProgressScreenController>(LevelProgressScreenView, {
      Controller: LevelProgressScreenController,
      attachToParent: this.attachToHud
    });
  }

  private createGroundGrid(): void {
    if (!this.worldDebugger) throw new Error("WorldDebugger is not initialized");

    this.worldDebugger.createGroundGrid({
      size: 20,
      divisions: 20,
      color1: 0x223047,
      color2: 0x152033,
      y: -0.75
    });
  }

  private createMainScreen(): void {
    this.viewFactory.createScreen(MainScreenView, null, this.config.transitions.mainScreenEnter);
  }

  private showLevelProgressScreen(): void {
    this.viewFactory.createScreen(
      LevelProgressScreenView,
      null,
      this.config.transitions.levelProgressScreenEnter
    );
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

