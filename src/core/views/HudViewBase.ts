import * as PIXI from "pixi.js";
import type { IView } from "./IView.js";
import type { IViewController } from "./IViewController.js";
import type { IViewFactory } from "./IViewFactory.js";
import type { AssetLoader } from "../assets/AssetLoader.js";

/**
 * Base class for HUD (2D) views.
 *
 * - Extends `PIXI.Container` so it can be attached to the Pixi display tree.
 * - Implements the `IView` lifecycle used by `ViewFactory`.
 */
export class HudViewBase extends PIXI.Container implements IView {
  //  MEMBERS
  private controller: IViewController | null = null;
  private viewFactoryInternal: IViewFactory | null = null;
  private assetLoaderInternal: AssetLoader | null = null;

  //  PROPERTIES
  protected get viewFactory(): IViewFactory {
    if (!this.viewFactoryInternal) throw new Error("HudViewBase is not initialized");
    return this.viewFactoryInternal;
  }

  protected get assetLoader(): AssetLoader {
    if (!this.assetLoaderInternal) throw new Error("HudViewBase is not initialized");
    return this.assetLoaderInternal;
  }

  public initialize(viewFactory: IViewFactory, assetLoader: AssetLoader): void {
    this.viewFactoryInternal = viewFactory;
    this.assetLoaderInternal = assetLoader;
  }

  public postInitialize(): void {}

  public setController(controller: IViewController | null): void {
    this.controller = controller;
  }

  public preDestroy(): void {}

  public destroy(): void {
    this.preDestroy();

    this.controller?.destroy();
    this.controller = null;

    this.viewFactoryInternal = null;
    this.assetLoaderInternal = null;

    this.removeAllListeners();
    this.removeFromParent();

    super.destroy();
  }
}

