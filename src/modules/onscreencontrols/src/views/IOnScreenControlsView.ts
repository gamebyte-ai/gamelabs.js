import type { IView } from "../../../../core/views/IView.js";
import type { Unsubscribe } from "../../../../core/events/subscriptions.js";
import type { ControlConfig } from "../OnScreenControlTypes.js";

export interface IOnScreenControlsView extends IView {
  resize(width: number, height: number): void;
  createControl(config: ControlConfig): void;
  removeControl(id: string): void;
  onButtonStateChanged(cb: (id: string, isDown: boolean) => void): Unsubscribe;
  onJoystickDirectionChanged(cb: (id: string, nx: number, ny: number) => void): Unsubscribe;
}
