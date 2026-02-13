import type { IViewController } from "./IViewController.js";

export interface IView {
  /**
   * Registers the controller responsible for this view.
   * Views are expected to call `controller.destroy()` during `destroy()`.
   */
  setController(controller: IViewController | null): void;

  destroy(): void;
}

