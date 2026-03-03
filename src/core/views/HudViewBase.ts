import * as PIXI from "pixi.js";
import type { IView } from "./IView.js";
import type { IViewController } from "./IViewController.js";
import type { IViewFactory } from "./IViewFactory.js";
import type { AssetLoader } from "../assets/AssetLoader.js";
import type { ILogger } from "../dev/ILogger.js";
import { LogTypes } from "../dev/LogTypes.js";

/**
 * Base class for HUD (2D) views.
 *
 * - Extends `PIXI.Container` so it can be attached to the Pixi display tree.
 * - Implements the `IView` lifecycle used by `ViewFactory`.
 */
export class HudViewBase extends PIXI.Container implements IView {
  //  MEMBERS
  private _viewFactory: IViewFactory | null = null;
  private _assetLoader: AssetLoader | null = null;
  private _loggerInternal: ILogger | null = null;
  private _controller: IViewController | null = null;

  //  PROPERTIES
  protected get viewFactory(): IViewFactory {
    if (!this._viewFactory) {
      this._loggerInternal?.log("HudViewBase is not initialized", LogTypes.Error);
      throw new Error("HudViewBase is not initialized");
    }
    return this._viewFactory;
  }

  protected get assetLoader(): AssetLoader {
    if (!this._assetLoader) {
      this._loggerInternal?.log("HudViewBase is not initialized", LogTypes.Error);
      throw new Error("HudViewBase is not initialized");
    }
    return this._assetLoader;
  }

  protected get logger(): ILogger {
    if (!this._loggerInternal) {
      throw new Error("HudViewBase is not initialized");
    }
    return this._loggerInternal;
  }

  //  METHODS
  public initialize(viewFactory: IViewFactory, assetLoader: AssetLoader, logger: ILogger): void {
    this._viewFactory = viewFactory;
    this._assetLoader = assetLoader;
    this._loggerInternal = logger;
  }

  public postInitialize(): void {}

  public setController(controller: IViewController | null): void {
    this._controller = controller;
  }

  public preDestroy(): void {}

  public destroy(): void {
    this.preDestroy();

    this._controller?.destroy();
    this._controller = null;

    this._viewFactory = null;
    this._assetLoader = null;
    this._loggerInternal = null;

    this.removeAllListeners();
    this.removeFromParent();

    super.destroy();
  }
}

