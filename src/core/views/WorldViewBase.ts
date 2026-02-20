import * as THREE from "three";
import type { IView } from "./IView.js";
import type { IViewController } from "./IViewController.js";
import type { IViewFactory } from "./IViewFactory.js";
import type { AssetLoader } from "../assets/AssetLoader.js";

/**
 * Base class for world (3D) views.
 *
 * - Extends `THREE.Group` so it can be attached to a scene graph.
 * - Implements `IView` controller lifecycle.
 */
export class WorldViewBase extends THREE.Group implements IView {
  private controller: IViewController | null = null;

  private viewFactoryInternal: IViewFactory | null = null;
  private assetLoaderInternal: AssetLoader | null = null;

  protected get viewFactory(): IViewFactory {
    if (!this.viewFactoryInternal) throw new Error("WorldViewBase is not initialized");
    return this.viewFactoryInternal;
  }

  protected get assetLoader(): AssetLoader {
    if (!this.assetLoaderInternal) throw new Error("WorldViewBase is not initialized");
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

  public destroy(): void {
    // Views are expected to own controller lifetime.
    this.controller?.destroy();
    this.controller = null;

    this.viewFactoryInternal = null;
    this.assetLoaderInternal = null;

    // Detach from scene graph. Subclasses should dispose their resources.
    this.removeFromParent();
  }
}

