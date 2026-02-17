import { UnsubscribeBag, type IInstanceResolver, type IViewController, UpdateService } from "gamelabsjs";
import type { ICubeView } from "../views/ICubeView";
import { GameEvents } from "../events/GameEvents";

export class CubeController implements IViewController<ICubeView> {
  private view: ICubeView | null = null;
  private update: UpdateService | null = null;
  private gameEvents: GameEvents | null = null;
  private readonly subs = new UnsubscribeBag();
  private rotationEnabled = true;

  initialize(view: ICubeView, resolver: IInstanceResolver): void {
    this.view = view;
    this.update = resolver.getInstance(UpdateService);
    this.gameEvents = resolver.getInstance(GameEvents);

    // Run early in the frame so rendering happens consistently.
    this.subs.add(this.update.register((dt: number) => this.onUpdate(dt), 0));
    this.subs.add(this.gameEvents.onChangeCubeColor((hex: number) => {
      this.view?.setColor(hex);
    }));
    this.subs.add(this.gameEvents.onToggleCubeRotation(() => {
      this.rotationEnabled = !this.rotationEnabled;
    }));
  }

  private onUpdate(dt: number): void {
    if (!this.rotationEnabled) return;
    this.view?.rotate(dt * 0.6, dt * 0.9);
  }

  destroy(): void {
    this.subs.flush();
    this.view = null;
    this.update = null;
    this.gameEvents = null;
  }
}
