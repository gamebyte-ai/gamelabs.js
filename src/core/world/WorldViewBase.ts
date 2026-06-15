import type { IView } from "../views/IView.js";
import type { IViewController } from "../views/IViewController.js";
import type { IInstanceResolver } from "../di/IInstanceResolver.js";
import type { IViewFactory } from "../views/IViewFactory.js";
import { AssetManager } from "../assets/AssetManager.js";
import { WorldInteractiveObject } from "./WorldInteractiveObject.js";
import { ILogger } from "../dev/ILogger.js";
import { IInputManager as IInputManagerToken } from "../input/IInputManager.js";
import { LogTypes } from "../dev/LogTypes.js";
import { IApp } from "../app/IApp.js";
import { AppEvents } from "../app/AppEvents.js";
import { UnsubscribeBag } from "../events/subscriptions.js";

/**
 * Base class for world (3D) views.
 *
 * - Extends `THREE.Group` so it can be attached to a scene graph.
 * - Implements `IView` controller lifecycle.
 * - Subscribes to `AppEvents.onResize` in `postInitialize()` and dispatches
 *   to `onResize(w, h, dpr)` with the current app size so subclasses only
 *   need to override `onResize`.
 */
export class WorldViewBase extends WorldInteractiveObject implements IView {
  //  MEMBERS
  private _viewFactory: IViewFactory | null = null;
  private _addedForFactory: (() => void) | null = null;
  private _removedForFactory: (() => void) | null = null;
  private _assetLoader: AssetManager | null = null;
  private _logger: ILogger | null = null;
  private _controller: IViewController | null = null;
  private _app: IApp | null = null;
  private _appEvents: AppEvents | null = null;
  protected readonly _subs = new UnsubscribeBag();

  //  PROPERTIES
  protected get viewFactory(): IViewFactory {
    if (!this._viewFactory) {
      this._logger?.log("WorldViewBase is not initialized", LogTypes.Error);
      throw new Error("WorldViewBase is not initialized");
    }
    return this._viewFactory;
  }

  protected get assetLoader(): AssetManager {
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
    this._assetLoader = resolver.getInstance(AssetManager);
    this._logger = resolver.getInstance(ILogger);
    this._app = resolver.getInstance(IApp);
    this._appEvents = resolver.getInstance(AppEvents);
  }

  public setViewFactory(viewFactory: IViewFactory, addedForFactory: () => void, removedForFactory: () => void): void {
    if (this._viewFactory) {
      throw new Error("View factory already set");
    }
    this._viewFactory = viewFactory;
    this._addedForFactory = addedForFactory;
    this._removedForFactory = removedForFactory;
    this.addEventListener("added", this.onAddedForManager);
    this.addEventListener("removed", this.onRemovedForManager);
  }

  private onAddedForManager(_event: object): void {
    this._addedForFactory?.();
    this._viewFactory?.viewAdded(this);
  }

  private onRemovedForManager(_event: object): void {
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

  public postInitialize(): void {
    // Defer the initial onResize so subclass `postInitialize` bodies finish
    // creating their children before resize fires. Calling synchronously here
    // crashes subclasses that build objects after `super.postInitialize()`.
    if (this._app) {
      const app = this._app;
      queueMicrotask(() => {
        if (this._app !== app) return;
        this.onResize(app.width, app.height, app.dpr);
      });
    }
    if (this._appEvents) {
      this._subs.add(this._appEvents.onResize((w, h, dpr) => this.onResize(w, h, dpr)));
    }
  }

  public onResize(_width: number, _height: number, _dpr: number): void {}

  public setController(controller: IViewController | null): void {
    this._controller = controller;
  }

  public preDestroy(): void {}

  public destroy(): void {
    this._subs.flush();
    this.preDestroy();

    this._controller?.destroy();
    this._controller = null;

    this._viewFactory = null;
    this._assetLoader = null;
    this._logger = null;
    this._app = null;
    this._appEvents = null;

    // Detach from scene graph. Subclasses should dispose their resources.
    this.removeFromParent();

    super.destroy();
  }
}
