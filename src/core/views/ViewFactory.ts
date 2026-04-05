import type { IView } from "./IView.js";
import type { IViewController } from "./IViewController.js";
import type { IViewFactory } from "./IViewFactory.js";
import type { IInstanceResolver } from "../di/IInstanceResolver.js";
import type { DIContainer } from "../di/DIContainer.js";
import { ILogger } from "../dev/ILogger.js";
import { LogTypes } from "../dev/LogTypes.js";
import type { IScreenView } from "../ui/IScreenView.js";
import type { IPopupView } from "../ui/IPopupView.js";
import { SCREEN_TRANSITION_TYPES, type ScreenTransition } from "../ui/ScreenTransition.js";
import { UIEvents } from "../ui/UIEvents.js";
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
  private readonly _screenRegistry = new Map<ViewCtor<any>, ControllerCtor<any, any>>();
  private readonly _popupRegistry = new Map<ViewCtor<any>, ControllerCtor<any, any>>();
  private readonly _defaultScreenTransition: ScreenTransition = { type: SCREEN_TRANSITION_TYPES.INSTANT, durationMs: 0 };
  private _activeScreen: IScreenView | null = null;
  private readonly _popupStack: IPopupView[] = [];
  private _lastResize: { width: number; height: number; dpr: number } | null = null;

  private _uiEvents: UIEvents | null = null;
  public world: IWorld | null = null;
  public hud: IHud | null = null;

  constructor(
    public readonly logger: ILogger,
    public readonly diContainer: DIContainer,
    public readonly viewDiContainer: TResolver
  ) {}

  public setUIEvents(uiEvents: UIEvents): void {
    this._uiEvents = uiEvents;
    this._uiEvents.onCreateScreen((View, transition) => {
      this.handleCreateScreen(View, transition);
    });
    this._uiEvents.onCreatePopup((View) => {
      this.handleCreatePopup(View);
    });
    this._uiEvents.onRemoveTopPopup(() => {
      this.handleRemoveTopPopup();
    });
    this._uiEvents.onRemoveAllPopups(() => {
      this.handleRemoveAllPopups();
    });
  }

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

  public registerScreen<TView extends IScreenView, TController extends IViewController<TView>>(
    View: ViewCtor<TView>,
    Controller: ControllerCtor<TView, TController>
  ): void {
    this._screenRegistry.set(View, Controller as ControllerCtor<any, any>);
  }

  public registerPopup<TView extends IPopupView, TController extends IViewController<TView>>(
    View: ViewCtor<TView>,
    Controller: ControllerCtor<TView, TController>
  ): void {
    this._popupRegistry.set(View, Controller as ControllerCtor<any, any>);
  }

  public resize(width: number, height: number, dpr: number): void {
    this._lastResize = { width, height, dpr };
    this._activeScreen?.onResize?.(width, height, dpr);
    for (const popup of this._popupStack) {
      popup.onResize?.(width, height, dpr);
    }
  }

  public createView<TView extends IView>(View: ViewCtor<TView>): TView {
    const Controller = this._registry.get(View);
    if (!Controller) {
      const msg = `No ViewFactory registration for view: ${View.name || "(anonymous view)"}`;
      this.logger.log(msg, LogTypes.Error);
      throw new Error(msg);
    }
    return this.createWithController(View, Controller);
  }

  public viewAdded(_view: IView): void {
  }

  public viewRemoved(_view: IView): void {
  }

  private createWithController<TView extends IView>(View: ViewCtor<TView>, Controller: ControllerCtor<any, any>): TView {
    const view = new View() as TView;
    const controller = new Controller();

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

  private handleCreateScreen(View: new () => IScreenView, transition: ScreenTransition | null): void {
    const Controller = this._screenRegistry.get(View as ViewCtor<any>);
    if (!Controller) {
      const msg = `No screen registration for: ${View.name || "(anonymous screen)"}`;
      this.logger.log(msg, LogTypes.Error);
      throw new Error(msg);
    }

    const resolvedTransition = transition ?? this._defaultScreenTransition;
    if (this._activeScreen) {
      this._activeScreen.onExit?.(resolvedTransition);
      this._activeScreen = null;
    }

    const screen = this.createWithController(View as ViewCtor<any>, Controller) as IScreenView;
    if (!(screen instanceof HudViewBase)) {
      const msg = `Screen ${View.name || "(anonymous)"} must extend HudViewBase`;
      this.logger.log(msg, LogTypes.Error);
      throw new Error(msg);
    }
    this.hud?.addView(screen);
    this._activeScreen = screen;
    if (this._lastResize) {
      this._activeScreen.onResize?.(this._lastResize.width, this._lastResize.height, this._lastResize.dpr);
    }
    this._activeScreen.onEnter?.(resolvedTransition);
  }

  private handleCreatePopup(View: new () => IPopupView): void {
    const Controller = this._popupRegistry.get(View as ViewCtor<any>);
    if (!Controller) {
      const msg = `No popup registration for: ${View.name || "(anonymous popup)"}`;
      this.logger.log(msg, LogTypes.Error);
      throw new Error(msg);
    }

    const popupView = this.createWithController(View as ViewCtor<any>, Controller);
    if (!(popupView instanceof HudViewBase)) {
      const msg = `Popup ${View.name || "(anonymous)"} must extend HudViewBase`;
      this.logger.log(msg, LogTypes.Error);
      throw new Error(msg);
    }
    const popup = popupView as unknown as IPopupView;
    this.hud?.addView(popupView);
    this._popupStack.push(popup);
    if (this._lastResize) {
      popup.onResize?.(this._lastResize.width, this._lastResize.height, this._lastResize.dpr);
    }
    popup.onOpen?.();
  }

  private handleRemoveTopPopup(): void {
    const popup = this._popupStack.pop();
    if (!popup) return;
    const view = popup as HudViewBase;
    if (popup.onClose) {
      popup.onClose(() => { view.destroy(); });
    } else {
      view.destroy();
    }
  }

  private handleRemoveAllPopups(): void {
    while (this._popupStack.length > 0) {
      const popup = this._popupStack.pop()!;
      const view = popup as HudViewBase;
      if (popup.onClose) {
        popup.onClose(() => { view.destroy(); });
      } else {
        view.destroy();
      }
    }
  }

}
