import {
  UnsubscribeBag,
  type IInstanceResolver,
  type IViewController
} from "gamelabsjs";
import type { ILevelProgressScreenView } from "../views/ILevelProgressScreen.js";
import { LevelProgressScreenEvents } from "../events/LevelProgressScreenEvents.js";

/**
 * Level progress screen controller.
 */
export class LevelProgressScreenController implements IViewController<ILevelProgressScreenView> {
  private view: ILevelProgressScreenView | null = null;
  private readonly subs = new UnsubscribeBag();
  private events: LevelProgressScreenEvents | null = null;

  initialize(view: ILevelProgressScreenView, resolver: IInstanceResolver): void {
    this.view = view;
    this.events = resolver.getInstance(LevelProgressScreenEvents);

    this.subs.add(this.view.onCurrentLevelClick(() => this.events?.emitCurrentLevelClick()));
    this.subs.add(this.view.onBackClick(() => this.events?.emitBackClick()));
  }

  destroy(): void {
    this.subs.flush();
    this.view = null;
    this.events = null;
  }
}

