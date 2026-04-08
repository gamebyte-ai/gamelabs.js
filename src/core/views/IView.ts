import type { IInjectionTarget } from "../di/IInjectionTarget.js";
import type { IViewController } from "./IViewController.js";
import type { IViewFactory } from "./IViewFactory.js";

export interface IView extends IInjectionTarget {
  setViewFactory(viewFactory: IViewFactory, added: () => void, removed: () => void): void;
  /**
   * Hook for view-side setup after injection.
   * Called after `inject()` by the ViewFactory.
   */
  initialize(): void;

  /**
   * Hook for view-side setup that depends on services injected by `inject()`.
   * Called immediately after `initialize()` by the ViewFactory.
   */
  postInitialize(): void;

  /**
   * Registers the controller responsible for this view.
   * Views are expected to call `controller.destroy()` during `destroy()`.
   */
  setController(controller: IViewController | null): void;

  preDestroy(): void;

  destroy(): void;
}
