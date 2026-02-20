import type { IView } from "./IView.js";
import type { IViewController } from "./IViewController.js";
import type { IViewFactory } from "./IViewFactory.js";
import type { IViewContainer } from "./IViewContainer.js";
import type { IInstanceResolver } from "../di/IInstanceResolver.js";
import type { AssetLoader } from "../assets/AssetLoader.js";
import type { IScreen } from "../ui/IScreen.js";
import type { ScreenTransition } from "../ui/ScreenTransition.js";

export type ViewCtor<TView extends IView> = new () => TView;

export type ControllerCtor<TView extends IView, TController extends IViewController<TView>> = new () => TController;

export type ViewFactoryRegistration<
  TResolver extends IInstanceResolver,
  TView extends IView,
  TController extends IViewController<TView>
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

export type ViewFactoryContainerRegistration<
  TResolver extends IInstanceResolver,
  TView extends IView,
  TController extends IViewController<TView>
> = Omit<ViewFactoryRegistration<TResolver, TView, TController>, "attachToParent">;

/**
 * View + Controller factory with a registration map.
 *
 * - Register View ↔ Controller pairs once (composition root).
 * - Create views with `createView(View, parent)`; controller deps are derived from `resolver`.
 */
export class ViewFactory<TResolver extends IInstanceResolver> implements IViewFactory {
  private readonly registry = new Map<ViewCtor<any>, ViewFactoryRegistration<TResolver, any, any>>();
  private activeScreen: (IView & IScreen) | null = null;
  private lastResize: { width: number; height: number; dpr: number } | null = null;

  world: IViewContainer | null = null;
  hud: IViewContainer | null = null;

  constructor(
    readonly resolver: TResolver,
    private readonly assetLoader: AssetLoader
  ) {}

  setViewContainers(world: IViewContainer | null, hud: IViewContainer | null): void {
    this.world = world;
    this.hud = hud;
  }

  registerHudView<TView extends IView, TController extends IViewController<TView>>(
    View: ViewCtor<TView>,
    registration: ViewFactoryContainerRegistration<TResolver, TView, TController>
  ): void {
    this.register<TView, TController>(View, {
      ...registration,
      attachToParent: (parent: unknown, view: unknown) => {
        if (!this.hud) throw new Error("HUD view container is not set");
        this.hud.attachChild(view, parent);
      }
    });
  }

  registerWorldView<TView extends IView, TController extends IViewController<TView>>(
    View: ViewCtor<TView>,
    registration: ViewFactoryContainerRegistration<TResolver, TView, TController>
  ): void {
    this.register<TView, TController>(View, {
      ...registration,
      attachToParent: (parent: unknown, view: unknown) => {
        if (!this.world) throw new Error("World view container is not set");
        this.world.attachChild(view, parent);
      }
    });
  }

  register<TView extends IView, TController extends IViewController<TView>>(
    View: ViewCtor<TView>,
    registration: ViewFactoryRegistration<TResolver, TView, TController>
  ): void {
    // Map erases generics; keep the API strongly typed at the edges.
    this.registry.set(View, registration as ViewFactoryRegistration<TResolver, any, any>);
  }

  create<TView extends IView, TController extends IViewController<TView>>(View: ViewCtor<TView>, parent: unknown): {
    view: TView;
    controller: TController;
  } {
    const registration = this.registry.get(View);
    if (!registration) {
      throw new Error(`No ViewFactory registration for view: ${View.name || "(anonymous view)"}`);
    }

    const view = (registration.create?.(this.resolver) ?? new View()) as TView;
    registration.attachToParent(parent, view);

    view.initialize(this, this.assetLoader);
    view.postInitialize();
    const controller = new registration.Controller() as TController;
    view.setController(controller);
    controller.initialize(view, this.resolver);
    return { view, controller };
  }

  createView<TView extends IView>(View: ViewCtor<TView>, parent: unknown): TView {
    return this.create<TView, IViewController<TView>>(View, parent).view;
  }

  createScreen<TView extends IView & IScreen>(
    View: ViewCtor<TView>,
    parent: unknown,
    enterTransition: ScreenTransition
  ): void {
    if (this.activeScreen) {
      this.activeScreen.onExit?.(enterTransition);
      this.activeScreen = null;
    }

    const screen = this.createView(View, parent);
    this.activeScreen = screen;
    if (this.lastResize) {
      this.activeScreen.onResize?.(this.lastResize.width, this.lastResize.height, this.lastResize.dpr);
    }
    this.activeScreen.onEnter?.(enterTransition);
  }

  resize(width: number, height: number, dpr: number): void {
    this.lastResize = { width, height, dpr };
    this.activeScreen?.onResize?.(width, height, dpr);
  }
}

