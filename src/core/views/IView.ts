import type { IViewController } from "./IViewController.js";
import type { IViewFactory } from "./IViewFactory.js";
import type { AssetLoader } from "../assets/AssetLoader.js";
import type { ILogger } from "../dev/ILogger.js";

export interface IView {
  /**
   * Provides restricted app services to the view at wiring time.
   * Called before `setController()` by the ViewFactory.
   */
  initialize(viewFactory: IViewFactory, assetLoader: AssetLoader, logger: ILogger): void;

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

  preDestroy(): void;

  destroy(): void;
}

