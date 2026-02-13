import type { IViewController, UpdateService } from "gamelabsjs";
import type { ICubeView } from "../views/ICubeView";
import type { GameEvents } from "../events/GameEvents";

export class CubeController implements IViewController {
  private readonly view: ICubeView;
  private readonly update: UpdateService;
  private readonly events: GameEvents;
  private unsubscribeUpdate: (() => void) | null = null;
  private unsubscribeCubeColor: (() => void) | null = null;
  private unsubscribeToggleRotation: (() => void) | null = null;
  private rotationEnabled = true;

  constructor(deps: { view: ICubeView; update: UpdateService; events: GameEvents }) {
    this.view = deps.view;
    this.update = deps.update;
    this.events = deps.events;
  }

  initialize(): void {
    // Run early in the frame so rendering happens consistently.
    this.unsubscribeUpdate = this.update.register((dt: number) => this.onUpdate(dt), 0);
    this.unsubscribeCubeColor = this.events.onChangeCubeColor((hex: number) => {
      this.view.setColor(hex);
    });
    this.unsubscribeToggleRotation = this.events.onToggleCubeRotation(() => {
      this.rotationEnabled = !this.rotationEnabled;
    });
  }

  private onUpdate(dt: number): void {
    if (!this.rotationEnabled) return;
    this.view.rotate(dt * 0.6, dt * 0.9);
  }

  destroy(): void {
    this.unsubscribeUpdate?.();
    this.unsubscribeUpdate = null;
    this.unsubscribeCubeColor?.();
    this.unsubscribeCubeColor = null;
    this.unsubscribeToggleRotation?.();
    this.unsubscribeToggleRotation = null;
  }
}
