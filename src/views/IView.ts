import type { IViewController } from "./IViewController.js";
import type { IViewFactory } from "./IViewFactory.js";
import type { AssetLoader } from "../core/AssetLoader.js";

export interface IView {
  /**
   * Provides restricted app services to the view at wiring time.
   * Called before `setController()` by the ViewBinder.
   */
  initialize(viewFactory: IViewFactory, assetLoader: AssetLoader): void;

  /**
   * Hook for view-side setup that depends on services injected by `initialize()`.
   * Called immediately after `initialize()` by the ViewFactory.
   */
  postInitialize(): void;

  /**
   * Registers the controller responsible for this view.
   * Views are expected to call `controller.destroy()` during `destroy()`.
   */
  setController(controller: IViewController | null): void;

  destroy(): void;
}

