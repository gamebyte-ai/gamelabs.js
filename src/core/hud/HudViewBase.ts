import * as PIXI from "pixi.js";
import type { IView } from "../views/IView.js";
import type { IViewController } from "../views/IViewController.js";
import type { IInstanceResolver } from "../di/IInstanceResolver.js";
import type { IViewFactory } from "../views/IViewFactory.js";
import { AssetManager } from "../assets/AssetManager.js";
import { ILogger } from "../dev/ILogger.js";
import { LogTypes } from "../dev/LogTypes.js";
import { IApp } from "../app/IApp.js";
import { AppEvents } from "../app/AppEvents.js";
import { StyleManager } from "../styles/StyleManager.js";
import { UnsubscribeBag } from "../events/subscriptions.js";

/**
 * Base class for HUD (2D) views.
 *
 * - Extends `PIXI.Container` so it can be attached to the Pixi display tree.
 * - Implements the `IView` lifecycle used by `ViewFactory`.
 * - Subscribes to `AppEvents.onResize` in `postInitialize()` and dispatches
 *   to `onResize(w, h, dpr)` with the current app size so subclasses only
 *   need to override `onResize`.
 */
export class HudViewBase extends PIXI.Container implements IView {
  //  MEMBERS
  private _viewFactory: IViewFactory | null = null;
  private _addedForFactory: (() => void) | null = null;
  private _removedForFactory: (() => void) | null = null;
  private _assetLoader: AssetManager | null = null;
  private _logger: ILogger | null = null;
  private _controller: IViewController | null = null;
  private _app: IApp | null = null;
  private _appEvents: AppEvents | null = null;
  private _styleManager: StyleManager | null = null;
  protected readonly _subs = new UnsubscribeBag();

  //  PROPERTIES
  protected get viewFactory(): IViewFactory {
    if (!this._viewFactory) {
      this._logger?.log("HudViewBase is not initialized", LogTypes.Error);
      throw new Error("HudViewBase is not initialized");
    }
    return this._viewFactory;
  }

  protected get assetLoader(): AssetManager {
    if (!this._assetLoader) {
      this._logger?.log("HudViewBase is not initialized", LogTypes.Error);
      throw new Error("HudViewBase is not initialized");
    }
    return this._assetLoader;
  }

  protected get logger(): ILogger {
    if (!this._logger) {
      throw new Error("HudViewBase is not initialized");
    }
    return this._logger;
  }

  protected get styleManager(): StyleManager {
    if (!this._styleManager) {
      this._logger?.log("HudViewBase is not initialized", LogTypes.Error);
      throw new Error("HudViewBase is not initialized");
    }
    return this._styleManager;
  }

  //  METHODS
  public inject(resolver: IInstanceResolver): void {
    this._assetLoader = resolver.getInstance(AssetManager);
    this._logger = resolver.getInstance(ILogger);
    this._app = resolver.getInstance(IApp);
    this._appEvents = resolver.getInstance(AppEvents);
    this._styleManager = resolver.getInstance(StyleManager);
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
    if (this._app) this.onResize(this._app.width, this._app.height, this._app.dpr);
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
    this._styleManager = null;

    this.removeAllListeners();
    this.removeFromParent();

    super.destroy();
  }
}
