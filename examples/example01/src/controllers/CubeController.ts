import { UnsubscribeBag, type IInstanceResolver, type IViewController, UpdateService } from "gamelabsjs";
import type { ICubeView } from "../views/ICubeView";
import { GameEvents } from "../events/GameEvents";

export class CubeController implements IViewController {
  private readonly view: ICubeView;
  private readonly update: UpdateService;
  private readonly gameEvents: GameEvents;
  private readonly subs = new UnsubscribeBag();
  private rotationEnabled = true;

  constructor(deps: { view: ICubeView; resolver: IInstanceResolver }) {
    this.view = deps.view;
    this.update = deps.resolver.getInstance(UpdateService);
    this.gameEvents = deps.resolver.getInstance(GameEvents);
  }

  initialize(): void {
    // Run early in the frame so rendering happens consistently.
    this.subs.add(this.update.register((dt: number) => this.onUpdate(dt), 0));
    this.subs.add(this.gameEvents.onChangeCubeColor((hex: number) => {
      this.view.setColor(hex);
    }));
    this.subs.add(this.gameEvents.onToggleCubeRotation(() => {
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
