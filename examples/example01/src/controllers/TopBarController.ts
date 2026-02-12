import type { IController } from "gamelabsjs";
import type { ITopBarView } from "../views/ITopBarView";
import type { GameEvents } from "../events/GameEvents";

export class TopBarController implements IController {
  private readonly view: ITopBarView;
  private readonly events: GameEvents;

  private unsubscribeToggle: (() => void) | null = null;
  private unsubscribeToggleRotation: (() => void) | null = null;
  private toggled = false;

  constructor(deps: { view: ITopBarView; events: GameEvents }) {
    this.view = deps.view;
    this.events = deps.events;
  }

  initialize(): void {
    this.unsubscribeToggle = this.view.onToggleColor(() => {
      this.toggled = !this.toggled;
      this.events.emitChangeCubeColor(this.toggled ? 0xf97316 : 0x3b82f6);
    });

    this.unsubscribeToggleRotation = this.view.onToggleRotation(() => {
      this.events.emitToggleCubeRotation();
    });
  }

  destroy(): void {
    this.unsubscribeToggle?.();
    this.unsubscribeToggle = null;
    this.unsubscribeToggleRotation?.();
    this.unsubscribeToggleRotation = null;
  }
}

