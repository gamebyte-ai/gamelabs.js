import type { IView } from "../../../../core/views/IView.js";
import type { Unsubscribe } from "../../../../core/events/subscriptions.js";
import type { ControlConfig } from "../OnScreenControlTypes.js";

export interface IOnScreenControlsView extends IView {
  resize(width: number, height: number): void;
  createControl(config: ControlConfig): void;
  removeControl(id: string): void;
  /**
   * Updates the visual to match the manager's enabled flag for the
   * given control. Buttons render with their `disabled` visual, the
   * cursor flips to default, and the icon dims; joysticks dim their
   * base + knob to half their configured alpha and stop receiving
   * pointer drag. No-op for unknown ids.
   */
  setControlEnabled(id: string, enabled: boolean): void;
  /** Shows or hides the control's Pixi container. */
  setControlVisible(id: string, visible: boolean): void;
  /** Toggles the button's progress ring visibility. */
  setButtonProgressVisible(id: string, visible: boolean): void;
  /** Updates the progress ring's wedge sweep. `t` is in `[0, 1]`. */
  setButtonProgressValue(id: string, t: number): void;
  /** Updates a label's displayed text. No-op for non-label ids. */
  setLabelText(id: string, value: string): void;
  onButtonStateChanged(cb: (id: string, isDown: boolean) => void): Unsubscribe;
  onJoystickDirectionChanged(cb: (id: string, nx: number, ny: number) => void): Unsubscribe;
}
