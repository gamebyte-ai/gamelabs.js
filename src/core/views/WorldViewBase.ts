import * as THREE from "three";
import type { IView } from "./IView.js";
import type { IViewController } from "./IViewController.js";
import type { IInstanceResolver } from "../di/IInstanceResolver.js";
import type { IViewFactory } from "./IViewFactory.js";
import { AssetLoader } from "../assets/AssetLoader.js";
import { ILogger } from "../dev/ILogger.js";
import { IViewFactory as IViewFactoryToken } from "./IViewFactory.js";
import { LogTypes } from "../dev/LogTypes.js";

/**
 * Base class for world (3D) views.
 *
 * - Extends `THREE.Group` so it can be attached to a scene graph.
 * - Implements `IView` controller lifecycle.
 */
export class WorldViewBase extends THREE.Group implements IView {
  //  MEMBERS
  private _viewFactory: IViewFactory | null = null;
  private _assetLoader: AssetLoader | null = null;
  private _logger: ILogger | null = null;
  private _controller: IViewController | null = null;

  //  PROPERTIES
  protected get viewFactory(): IViewFactory {
    if (!this._viewFactory) {
      this._logger?.log("WorldViewBase is not initialized", LogTypes.Error);
      throw new Error("WorldViewBase is not initialized");
    }
    return this._viewFactory;
  }

  protected get assetLoader(): AssetLoader {
    if (!this._assetLoader) {
      this._logger?.log("WorldViewBase is not initialized", LogTypes.Error);
      throw new Error("WorldViewBase is not initialized");
    }
    return this._assetLoader;
  }

  protected get logger(): ILogger {
    if (!this._logger) {
      throw new Error("WorldViewBase is not initialized");
    }
    return this._logger;
  }

  //  METHODS
  public initialize(resolver: IInstanceResolver): void {
    this._viewFactory = resolver.getInstance(IViewFactoryToken);
    this._assetLoader = resolver.getInstance(AssetLoader);
    this._logger = resolver.getInstance(ILogger);
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
    this._logger = null;

    // Detach from scene graph. Subclasses should dispose their resources.
    this.removeFromParent();
  }
}

