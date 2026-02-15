import type { IView } from "./IView.js";
import type { IViewController } from "./IViewController.js";
import type { IViewFactory } from "./IViewFactory.js";
import type { ControllerCtor, ViewBinder } from "./ViewBinder.js";
import type { IInstanceResolver } from "../core/di/IInstanceResolver.js";

export type ViewCtor<TView extends IView> = new () => TView;

export type ViewFactoryRegistration<
  TResolver extends IInstanceResolver,
  TView extends IView,
  TController extends IViewController
> = {
  /**
   * Optional custom view constructor.
   * Useful for injecting restricted capabilities (e.g. `IViewFactory`) into views.
   */
  create?: (resolver: TResolver) => TView;
  Controller: ControllerCtor<TView, TController>;
  /**
   * Attaches `view` to the provided `parent`.
   *
   * This is intentionally typeless so view classes don't need special "attachX" methods
   * just to satisfy wiring. Registrations may cast internally.
   */
  attachToParent: (parent: unknown, view: unknown) => void;
};

/**
 * View + Controller factory with a registration map.
 *
 * - Register View ↔ Controller pairs once (composition root).
 * - Create views with `createView(View, parent)`; controller deps are derived from `resolver`.
 * - Uses `ViewBinder` for controller creation + lifecycle tracking.
 */
export class ViewFactory<TResolver extends IInstanceResolver> implements IViewFactory {
  private readonly registry = new Map<ViewCtor<any>, ViewFactoryRegistration<TResolver, any, any>>();

  constructor(
    private readonly binder: ViewBinder,
    readonly resolver: TResolver
  ) {}

  register<TView extends IView, TController extends IViewController>(
    View: ViewCtor<TView>,
    registration: ViewFactoryRegistration<TResolver, TView, TController>
  ): void {
    // Map erases generics; keep the API strongly typed at the edges.
    this.registry.set(View, registration as ViewFactoryRegistration<TResolver, any, any>);
  }

  create<TView extends IView, TController extends IViewController>(View: ViewCtor<TView>, parent: unknown): {
    view: TView;
    controller: TController;
  } {
    const registration = this.registry.get(View);
    if (!registration) {
      throw new Error(`No ViewFactory registration for view: ${View.name || "(anonymous view)"}`);
    }

    const view = (registration.create?.(this.resolver) ?? new View()) as TView;
    registration.attachToParent(parent, view);

    const controller = this.binder.bind(view, registration.Controller, this.resolver) as TController;
    return { view, controller };
  }

  createView<TView extends IView>(View: ViewCtor<TView>, parent: unknown): TView {
    return this.create<TView, IViewController>(View, parent).view;
  }
}

