import type { Unsubscribe } from "./subscriptions.js";

export interface IView {
  destroy(): void;
}

export interface IController {
  initialize(): void;
  destroy(): void;
}

export type ControllerCtor<TView extends IView, TDeps extends object, TController extends IController> = new (
  deps: { view: TView } & TDeps
) => TController;

/**
 * Semi-automatic View ↔ Controller binder.
 *
 * - Creates controller with `{ view, ...deps }`
 * - Calls `controller.initialize()`
 * - Tracks pairs for cleanup
 */
export class Binder {
  private readonly pairs: Array<{ view: IView; controller: IController }> = [];

  bind<TView extends IView, TDeps extends object, TController extends IController>(
    view: TView,
    Controller: ControllerCtor<TView, TDeps, TController>,
    deps: TDeps
  ): TController {
    const controller = new Controller({ view, ...deps });
    controller.initialize();
    this.pairs.push({ view, controller });
    return controller;
  }

  destroyAll(): void {
    // Destroy controllers first, then views.
    for (let i = this.pairs.length - 1; i >= 0; i--) {
      this.pairs[i]?.controller.destroy();
    }
    for (let i = this.pairs.length - 1; i >= 0; i--) {
      this.pairs[i]?.view.destroy();
    }
    this.pairs.length = 0;
  }
}

