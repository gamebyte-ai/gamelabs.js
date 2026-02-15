import * as THREE from "three";
import type { IView } from "./IView.js";
import type { IViewController } from "./IViewController.js";

/**
 * Base class for world (3D) views.
 *
 * - Extends `THREE.Group` so it can be attached to a scene graph.
 * - Implements `IView` controller lifecycle.
 */
export class WorldViewBase extends THREE.Group implements IView {
  protected controller: IViewController | null = null;

  setController(controller: IViewController | null): void {
    this.controller = controller;
  }

  destroy(): void {
    // Views are expected to own controller lifetime.
    this.controller?.destroy();
    this.controller = null;

    // Detach from scene graph. Subclasses should dispose their resources.
    this.removeFromParent();
  }
}

