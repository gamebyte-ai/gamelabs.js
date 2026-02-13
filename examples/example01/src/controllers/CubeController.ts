import { UnsubscribeBag, type IViewController, type UpdateService } from "gamelabsjs";
import type { ICubeView } from "../views/ICubeView";
import type { GameEvents } from "../events/GameEvents";

export class CubeController implements IViewController {
  private readonly view: ICubeView;
  private readonly update: UpdateService;
  private readonly events: GameEvents;
  private readonly subs = new UnsubscribeBag();
  private rotationEnabled = true;

  constructor(deps: { view: ICubeView; update: UpdateService; events: GameEvents }) {
    this.view = deps.view;
    this.update = deps.update;
    this.events = deps.events;
  }

  initialize(): void {
    // Run early in the frame so rendering happens consistently.
    this.subs.add(this.update.register((dt: number) => this.onUpdate(dt), 0));
    this.subs.add(this.events.onChangeCubeColor((hex: number) => {
      this.view.setColor(hex);
    }));
    this.subs.add(this.events.onToggleCubeRotation(() => {
      this.rotationEnabled = !this.rotationEnabled;
    }));
  }

  private onUpdate(dt: number): void {
    if (!this.rotationEnabled) return;
    this.view.rotate(dt * 0.6, dt * 0.9);
  }

  destroy(): void {
    this.subs.flush();
  }
}
