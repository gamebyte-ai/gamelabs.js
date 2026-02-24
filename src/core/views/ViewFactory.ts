import type { IView } from "./IView.js";
import type { IViewController } from "./IViewController.js";
import type { IViewFactory } from "./IViewFactory.js";
import type { IViewContainer } from "./IViewContainer.js";
import type { IInstanceResolver } from "../di/IInstanceResolver.js";
import type { AssetLoader } from "../assets/AssetLoader.js";
import type { IScreen } from "../ui/IScreen.js";
import { SCREEN_TRANSITION_TYPES, type ScreenTransition } from "../ui/ScreenTransition.js";

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
  private readonly _registry = new Map<ViewCtor<any>, ViewFactoryRegistration<TResolver, any, any>>();
  private readonly _defaultScreenTransition: ScreenTransition = { type: SCREEN_TRANSITION_TYPES.INSTANT, durationMs: 0 };
  private _activeScreen: (IView & IScreen) | null = null;
  private _lastResize: { width: number; height: number; dpr: number } | null = null;

  public world: IViewContainer | null = null;
  public hud: IViewContainer | null = null;

  constructor(
    public readonly resolver: TResolver,
    private readonly assetLoader: AssetLoader
  ) {}

  public setViewContainers(world: IViewContainer | null, hud: IViewContainer | null): void {
    this.world = world;
    this.hud = hud;
  }

  public registerHudView<TView extends IView, TController extends IViewController<TView>>(
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

  public registerWorldView<TView extends IView, TController extends IViewController<TView>>(
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

  public register<TView extends IView, TController extends IViewController<TView>>(
    View: ViewCtor<TView>,
    registration: ViewFactoryRegistration<TResolver, TView, TController>
  ): void {
    // Map erases generics; keep the API strongly typed at the edges.
    this._registry.set(View, registration as ViewFactoryRegistration<TResolver, any, any>);
  }

  public create<TView extends IView, TController extends IViewController<TView>>(View: ViewCtor<TView>, parent: unknown): {
    view: TView;
    controller: TController;
  } {
    const registration = this._registry.get(View);
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

  public createView<TView extends IView>(View: ViewCtor<TView>, parent: unknown): TView {
    return this.create<TView, IViewController<TView>>(View, parent).view;
  }

  public createScreen<TView extends IView & IScreen>(View: ViewCtor<TView>, parent: unknown, enterTransition: ScreenTransition | null): void {
    const resolvedEnterTransition = enterTransition ?? this._defaultScreenTransition;
    if (this._activeScreen) {
      this._activeScreen.onExit?.(resolvedEnterTransition);
      this._activeScreen = null;
    }

    const screen = this.createView(View, parent);
    this._activeScreen = screen;
    if (this._lastResize) {
      this._activeScreen.onResize?.(this._lastResize.width, this._lastResize.height, this._lastResize.dpr);
    }
    this._activeScreen.onEnter?.(resolvedEnterTransition);
  }

  public resize(width: number, height: number, dpr: number): void {
    this._lastResize = { width, height, dpr };
    this._activeScreen?.onResize?.(width, height, dpr);
  }
}

