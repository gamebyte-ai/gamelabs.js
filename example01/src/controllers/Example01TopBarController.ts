import type { IController } from "gamelabsjs";
import type { IExample01CubeView } from "../views/IExample01CubeView";
import type { IExample01TopBarView } from "../views/IExample01TopBarView";

export class Example01TopBarController implements IController {
  private readonly view: IExample01TopBarView;
  private readonly cube: IExample01CubeView;

  private unsubscribeToggle: (() => void) | null = null;
  private toggled = false;

  constructor(deps: { view: IExample01TopBarView; cube: IExample01CubeView }) {
    this.view = deps.view;
    this.cube = deps.cube;
  }

  initialize(): void {
    this.unsubscribeToggle = this.view.onToggleColor(() => {
      this.toggled = !this.toggled;
      this.cube.setColor(this.toggled ? 0xf97316 : 0x3b82f6);
    });
  }

  destroy(): void {
    this.unsubscribeToggle?.();
    this.unsubscribeToggle = null;
  }
}

