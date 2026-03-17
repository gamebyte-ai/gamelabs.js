import * as THREE from "three";
import type { IView } from "./IView.js";
import type { IViewController } from "./IViewController.js";
import type { IInstanceResolver } from "../di/IInstanceResolver.js";
import type { IViewFactory } from "./IViewFactory.js";
import type { IInputManager } from "../input/IInputManager.js";
import type { IPointerInputHandler } from "../input/IPointerInputHandler.js";
import { AssetLoader } from "../assets/AssetLoader.js";
import { ILogger } from "../dev/ILogger.js";
import { IViewFactory as IViewFactoryToken } from "./IViewFactory.js";
import { IInputManager as IInputManagerToken } from "../input/IInputManager.js";
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
  private _inputManager: IInputManager | null = null;
  private _isPointerInputHandlerCached: boolean | null = null;

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
  public inject(resolver: IInstanceResolver): void {
    this._viewFactory = resolver.getInstance(IViewFactoryToken);
    this._assetLoader = resolver.getInstance(AssetLoader);
    this._logger = resolver.getInstance(ILogger);
    if (this.isPointerInputHandler) {
      this._inputManager = resolver.getInstance(IInputManagerToken);
      this._inputManager.addPointerHandler(this as unknown as IPointerInputHandler);
    }
  }

  public get isPointerInputHandler(): boolean {
    if (this._isPointerInputHandlerCached === null) {
      this._isPointerInputHandlerCached =
        typeof (this as any).onPointerDown === "function" &&
        typeof (this as any).onPointerMove === "function" &&
        typeof (this as any).onPointerUp === "function" &&
        typeof (this as any).onPointerCancel === "function";
    }
    return this._isPointerInputHandlerCached;
  }

  public initialize(): void {}

  public postInitialize(): void {}

  public setController(controller: IViewController | null): void {
    this._controller = controller;
  }

  public preDestroy(): void {}

  public destroy(): void {
    this.preDestroy();

    if (this._inputManager) {
      this._inputManager.removePointerHandler(this as unknown as IPointerInputHandler);
      this._inputManager = null;
    }

    this._controller?.destroy();
    this._controller = null;

    this._viewFactory = null;
    this._assetLoader = null;
    this._logger = null;

    // Detach from scene graph. Subclasses should dispose their resources.
    this.removeFromParent();
  }
}

