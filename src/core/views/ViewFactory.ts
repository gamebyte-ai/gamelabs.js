import type { IView } from "./IView.js";
import type { IViewController } from "./IViewController.js";
import type { IViewFactory } from "./IViewFactory.js";
import type { IInstanceResolver } from "../di/IInstanceResolver.js";
import type { DIContainer } from "../di/DIContainer.js";
import { ILogger } from "../dev/ILogger.js";
import { LogTypes } from "../dev/LogTypes.js";
import type { IScreenView } from "../ui/IScreenView.js";
import { SCREEN_TRANSITION_TYPES, type ScreenTransition } from "../ui/ScreenTransition.js";
import { IWorld } from "../world/IWorld.js";
import { IHud } from "../hud/IHud.js";
import { HudViewBase } from "../hud/HudViewBase.js";

export type ViewCtor<TView extends IView> = new () => TView;

export type ControllerCtor<TView extends IView, TController extends IViewController<TView>> = new () => TController;

/**
 * View + Controller factory with a registration map.
 *
 * - Register View ↔ Controller pairs once (composition root).
 * - Create views with `createView(View, parent)`; controller deps are derived from `resolver`.
 */
export class ViewFactory<TResolver extends IInstanceResolver> implements IViewFactory {
  private readonly _registry = new Map<ViewCtor<any>, ControllerCtor<any, any>>();
  private readonly _defaultScreenTransition: ScreenTransition = { type: SCREEN_TRANSITION_TYPES.INSTANT, durationMs: 0 };
  private _activeScreen: IScreenView | null = null;
  private _lastResize: { width: number; height: number; dpr: number } | null = null;

  public world: IWorld | null = null;
  public hud: IHud | null = null;

  constructor(
    public readonly logger: ILogger,
    public readonly diContainer: DIContainer,
    public readonly viewDiContainer: TResolver
  ) {}

  public setViewContainers(world: IWorld | null, hud: IHud | null): void {
    this.world = world;
    this.hud = hud;
  }

  public register<TView extends IView, TController extends IViewController<TView>>(
    View: ViewCtor<TView>,
    Controller: ControllerCtor<TView, TController>
  ): void {
    this._registry.set(View, Controller as ControllerCtor<any, any>);
  }

  public resize(width: number, height: number, dpr: number): void {
    this._lastResize = { width, height, dpr };
    this._activeScreen?.onResize?.(width, height, dpr);
  }






  private createInternal<TView extends IView, TController extends IViewController<TView>>(View: ViewCtor<TView>): TView {
    const Controller = this._registry.get(View);
    if (!Controller) {
      const msg = `No ViewFactory registration for view: ${View.name || "(anonymous view)"}`;
      this.logger.log(msg, LogTypes.Error);
      throw new Error(msg);
    }

    const view = new View() as TView;
    const controller = new Controller() as TController;

    view.setViewFactory(this, ()=>{
      view.inject(this.viewDiContainer);
      view.initialize();
      view.postInitialize();

      view.setController(controller);
      controller.inject(this.diContainer);
      controller.initialize(view);
    }, ()=>{});
    return view;
  }

  public createView<TView extends IView>(View: ViewCtor<TView>): TView {
    return this.createInternal<TView, IViewController<TView>>(View);
  }

  public createScreenView<TView extends IScreenView>(View: ViewCtor<TView>, enterTransition: ScreenTransition | null): void {
    const resolvedEnterTransition = enterTransition ?? this._defaultScreenTransition;
    if (this._activeScreen) {
      this._activeScreen.onExit?.(resolvedEnterTransition);
      this._activeScreen = null;
    }

    const screen = this.createView(View);
    if (!(screen instanceof HudViewBase)) {
      const msg = `createScreenView: ${(View as any).name || "(anonymous)"} must extend HudViewBase`;
      this.logger.log(msg, LogTypes.Error);
      throw new Error(msg);
    }
    this.hud?.addView(screen);
    this._activeScreen = screen;
    if (this._lastResize) {
      this._activeScreen.onResize?.(this._lastResize.width, this._lastResize.height, this._lastResize.dpr);
    }
    this._activeScreen.onEnter?.(resolvedEnterTransition);
  }

  public viewAdded(_view: IView): void {
  }

  public viewRemoved(_view: IView): void {
  }


}
