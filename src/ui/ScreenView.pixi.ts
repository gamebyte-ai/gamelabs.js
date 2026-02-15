import "@pixi/layout";
import * as PIXI from "pixi.js";
import type { IScreenView } from "./IScreenView.js";
import type { ScreenTransition } from "./ScreenTransition.js";
import type { IViewController } from "../views/IViewController.js";

/**
 * Base PixiJS screen view.
 *
 * This is a convenience implementation that:
 * - is a `PIXI.Container`
 * - implements `IScreenView`
 * - provides safe default lifecycle hooks
 * - provides a `destroy()` that detaches from parent and removes listeners
 *
 * Concrete screens can extend this and add their own children and logic.
 */
export class ScreenView extends PIXI.Container implements IScreenView {
  protected controller: IViewController | null = null;

  constructor() {
    super();
    // Enable layout by default for Pixi screens. Apps can override styles in subclasses.
    (this as any).layout = { width: 1, height: 1 };
  }

  setController(controller: IViewController | null): void {
    this.controller = controller;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onEnter(_transition: ScreenTransition): void | Promise<void> {
    // Default: no-op.
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onExit(_transition: ScreenTransition): void | Promise<void> {
    // Default: no-op.
  }

  /**
   * Optional convenience for layout-enabled screens.
   * If you don't use layouts, you can ignore this.
   */
  resize(width: number, height: number): void {
    (this as any).layout = { width: Math.max(1, width), height: Math.max(1, height) };
  }

  override destroy(): void {
    this.controller?.destroy();
    this.controller = null;

    // Prefer explicit cleanup for interactive UI.
    this.removeAllListeners();
    this.removeFromParent();
    super.destroy();
  }
}

