import type { IView } from "../views/IView.js";
import type { IViewController } from "../views/IViewController.js";
import type { IInstanceResolver } from "../di/IInstanceResolver.js";
import type { IViewFactory } from "../views/IViewFactory.js";
import { AssetLoader } from "../assets/AssetLoader.js";
import { WorldInteractiveObject } from "./WorldInteractiveObject.js";
import { ILogger } from "../dev/ILogger.js";
import { IInputManager as IInputManagerToken } from "../input/IInputManager.js";
import { LogTypes } from "../dev/LogTypes.js";

/**
 * Base class for world (3D) views.
 *
 * - Extends `THREE.Group` so it can be attached to a scene graph.
 * - Implements `IView` controller lifecycle.
 */
export class WorldViewBase extends WorldInteractiveObject implements IView {
  //  MEMBERS
  private _viewFactory: IViewFactory | null = null;
  private _addedForFactory:Function | null = null;
  private _removedForFactory:Function | null = null;
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
  public inject(resolver: IInstanceResolver): void {
    this.setInputManager(resolver.getInstance(IInputManagerToken));
    this._assetLoader = resolver.getInstance(AssetLoader);
    this._logger = resolver.getInstance(ILogger);
  }

  public setViewFactory(viewFactory: IViewFactory, addedForFactory:Function, removedForFactory:Function): void {
    if (this._viewFactory) {
      throw new Error("View factory already set");
    }
    this._viewFactory = viewFactory;
    this._addedForFactory = addedForFactory;
    this._removedForFactory = removedForFactory;
    this.addEventListener("added", this.onAddedForManager);
    this.addEventListener("removed", this.onRemovedForManager);
  }

  private onAddedForManager(event: Object): void {
    this._addedForFactory?.();
    this._viewFactory?.viewAdded(this);
  }

  private onRemovedForManager(event: Object): void {
    if (this._viewFactory) {
      this._removedForFactory?.();
      this._viewFactory?.viewRemoved(this);

      this.removeEventListener("added", this.onAddedForManager);
      this.removeEventListener("removed", this.onRemovedForManager);
      this._viewFactory = null;
      this._addedForFactory = null;
      this._removedForFactory = null;
    }
  }

  public initialize(): void {}

  public postInitialize(): void {}

  public setController(controller: IViewController | null): void {
    this._controller = controller;
  }

  public preDestroy(): void {}

  public destroy(): void {
    super.destroy();
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
