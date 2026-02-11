import type { IController, UpdateService } from "gamelabsjs";
import type { IExample01CubeView } from "../views/IExample01CubeView";

export class Example01CubeController implements IController {
  private readonly view: IExample01CubeView;
  private readonly update: UpdateService;
  private readonly render: () => void;
  private unsubscribeUpdate: (() => void) | null = null;

  constructor(deps: { view: IExample01CubeView; update: UpdateService; render: () => void }) {
    this.view = deps.view;
    this.update = deps.update;
    this.render = deps.render;
  }

  initialize(): void {
    // Run early in the frame so rendering happens consistently.
    this.unsubscribeUpdate = this.update.register((dt: number) => this.onUpdate(dt), 0);
  }

  private onUpdate(dt: number): void {
    this.view.rotate(dt * 0.6, dt * 0.9);
    this.render();
  }

  destroy(): void {
    this.unsubscribeUpdate?.();
    this.unsubscribeUpdate = null;
  }
}

