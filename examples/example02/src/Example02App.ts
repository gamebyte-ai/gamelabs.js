import { GamelabsApp, INSTANT_SCREEN_TRANSITION } from "gamelabsjs";

import { MainScreenView, MainScreenController, MainScreenEvents } from "../modules/mainscreen/src/index.js";
import {
  LevelProgressScreenView,
  LevelProgressScreenController,
  LevelProgressScreenEvents
} from "../modules/levelprogressscreeen/src/index.js";

export class Example02App extends GamelabsApp {
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
      this.showLevelProgressScreenInstant();
    });

    const levelProgressEvents = this.di.getInstance(LevelProgressScreenEvents);
    this.unsubscribeBackClick = levelProgressEvents.onBackClick(() => {
      this.showMainScreenInstant();
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
    this.viewFactory.createScreen(MainScreenView, null, INSTANT_SCREEN_TRANSITION);
  }

  private showLevelProgressScreenInstant(): void {
    this.viewFactory.createScreen(LevelProgressScreenView, null, INSTANT_SCREEN_TRANSITION);
  }

  private showMainScreenInstant(): void {
    this.viewFactory.createScreen(MainScreenView, null, INSTANT_SCREEN_TRANSITION);
  }

  protected override preDestroy(): void {
    this.unsubscribePlayClick?.();
    this.unsubscribePlayClick = null;
    this.unsubscribeBackClick?.();
    this.unsubscribeBackClick = null;
  }
}

