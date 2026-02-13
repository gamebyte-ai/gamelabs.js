import type { IView } from "./IView.js";
import type { IViewController } from "./IViewController.js";
import type { IViewFactory } from "./IViewFactory.js";
import type { ControllerCtor, ViewBinder } from "./ViewBinder.js";

export type ViewCtor<TView extends IView> = new () => TView;

export type ViewFactoryRegistration<
  TCtx extends object,
  TView extends IView,
  TDeps extends object,
  TController extends IViewController
> = {
  /**
   * Optional custom view constructor.
   * Useful for injecting restricted capabilities (e.g. `IViewFactory`) into views.
   */
  create?: (ctx: TCtx) => TView;
  Controller: ControllerCtor<TView, TDeps, TController>;
  /**
   * Attaches `view` to the provided `parent`.
   *
   * This is intentionally typeless so view classes don't need special "attachX" methods
   * just to satisfy wiring. Registrations may cast internally.
   */
  attachToParent: (parent: unknown, view: unknown) => void;
  /**
   * Computes controller deps from the app context stored in the factory.
   * The view itself is always provided by `ViewBinder` as `{ view, ...deps }`.
   */
  deps: (ctx: TCtx) => TDeps;
};

/**
 * View + Controller factory with a registration map.
 *
 * - Register View ↔ Controller pairs once (composition root).
 * - Create views with `createView(View, parent)`; controller deps are derived from `ctx`.
 * - Uses `ViewBinder` for controller creation + lifecycle tracking.
 */
export class ViewFactory<TCtx extends object> implements IViewFactory {
  private readonly registry = new Map<ViewCtor<any>, ViewFactoryRegistration<TCtx, any, any, any>>();

  constructor(
    private readonly binder: ViewBinder,
    readonly ctx: TCtx
  ) {}

  register<TView extends IView, TDeps extends object, TController extends IViewController>(
    View: ViewCtor<TView>,
    registration: ViewFactoryRegistration<TCtx, TView, TDeps, TController>
  ): void {
    // Map erases generics; keep the API strongly typed at the edges.
    this.registry.set(View, registration as ViewFactoryRegistration<TCtx, any, any, any>);
  }

  create<TView extends IView, TController extends IViewController>(View: ViewCtor<TView>, parent: unknown): {
    view: TView;
    controller: TController;
  } {
    const registration = this.registry.get(View);
    if (!registration) {
      throw new Error(`No ViewFactory registration for view: ${View.name || "(anonymous view)"}`);
    }

    const view = (registration.create?.(this.ctx) ?? new View()) as TView;
    registration.attachToParent(parent, view);

    const controller = this.binder.bind(view, registration.Controller, registration.deps(this.ctx)) as TController;
    return { view, controller };
  }

  createView<TView extends IView>(View: ViewCtor<TView>, parent: unknown): TView {
    return this.create<TView, IViewController>(View, parent).view;
  }
}

