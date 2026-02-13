import type { Unsubscribe } from "../core/subscriptions.js";
import type { IView } from "./IView.js";
import type { IViewController } from "./IViewController.js";

export type ControllerCtor<TView extends IView, TDeps extends object, TController extends IViewController> = new (
  deps: { view: TView } & TDeps
) => TController;

/**
 * Semi-automatic View ↔ Controller binder.
 *
 * - Creates controller with `{ view, ...deps }`
 * - Calls `controller.initialize()`
 * - Tracks pairs for cleanup
 */
export class ViewBinder {
  private readonly pairs: Array<{ view: IView; controller: IViewController }> = [];

  bind<TView extends IView, TDeps extends object, TController extends IViewController>(
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

export type { Unsubscribe };

