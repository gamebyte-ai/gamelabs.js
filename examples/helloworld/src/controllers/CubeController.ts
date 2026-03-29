import { UnsubscribeBag, type IInstanceResolver, type IViewController, UpdateService, Orbital3dCameraController } from "gamelabsjs";
import type { ICubeView } from "../views/ICubeView";
import { GameEvents } from "../events/GameEvents";
import { HelloWorldConfig } from "../HelloWorldConfig";

export class CubeController implements IViewController<ICubeView> {
  private view: ICubeView | null = null;
  private update: UpdateService | null = null;
  private gameEvents: GameEvents | null = null;
  private orbitalController: Orbital3dCameraController | null = null;
  private config: HelloWorldConfig | null = null;
  private readonly subs = new UnsubscribeBag();
  private rotationEnabled = true;

  inject(resolver: IInstanceResolver): void {
    this.update = resolver.getInstance(UpdateService);
    this.gameEvents = resolver.getInstance(GameEvents);
    this.orbitalController = resolver.getInstance(Orbital3dCameraController);
    this.config = resolver.getInstance(HelloWorldConfig);
  }

  initialize(view: ICubeView): void {
    this.view = view;
    this.subs.add(this.update!.register((dt: number) => this.onUpdate(dt), 0));
    this.subs.add(this.gameEvents!.onChangeCubeColor((hex: number) => {
      this.view?.setColor(hex);
    }));
    this.subs.add(this.gameEvents!.onToggleCubeRotation(() => {
      this.rotationEnabled = !this.rotationEnabled;
    }));

    this.subs.add(this.view.onDrag((dx, dy) => {
      this.orbitalController?.addAzimuth(-dx);
      this.orbitalController?.addPitch(dy);
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
    this.orbitalController = null;
    this.config = null;
  }
}
