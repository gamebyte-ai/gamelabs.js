import type { IView } from "./IView.js";
import type { IViewController } from "./IViewController.js";
import type { IViewFactory } from "./IViewFactory.js";
import type { IInstanceResolver } from "../di/IInstanceResolver.js";
import type { DIContainer } from "../di/DIContainer.js";
import type { ILogger } from "../dev/ILogger.js";
import { LogTypes } from "../dev/LogTypes.js";
import type { IScreenView } from "../ui/IScreenView.js";
import type { IPopupView } from "../ui/IPopupView.js";
import { SCREEN_TRANSITION_TYPES, type ScreenTransition } from "../ui/ScreenTransition.js";
import type { UIEvents } from "../ui/UIEvents.js";
import type { IWorld } from "../world/IWorld.js";
import type { IHud } from "../hud/IHud.js";
import { HudLayer } from "../hud/HudLayer.js";
import { HudViewBase } from "../hud/HudViewBase.pixi.js";

export type ViewCtor<TView extends IView> = new () => TView;

export type ControllerCtor<TView extends IView, TController extends IViewController<TView>> = new () => TController;

/**
 * View + Controller factory with a registration map.
 *
 * - Register View ↔ Controller pairs once (composition root).
 * - Create views with `createView(View, parent)`; controller deps are derived from `resolver`.
 */
export class ViewFactory<TResolver extends IInstanceResolver> implements IViewFactory {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- type erasure: heterogeneous view/controller registry
  private readonly _registry = new Map<ViewCtor<any>, ControllerCtor<any, any>>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- type erasure: heterogeneous view/controller registry
  private readonly _screenRegistry = new Map<string, { View: ViewCtor<any>; Controller: ControllerCtor<any, any> }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- type erasure: heterogeneous view/controller registry
  private readonly _popupRegistry = new Map<string, { View: ViewCtor<any>; Controller: ControllerCtor<any, any> }>();
  private readonly _defaultScreenTransition: ScreenTransition = {
    type: SCREEN_TRANSITION_TYPES.INSTANT,
    durationMs: 0,
  };
  private _activeScreen: IScreenView | null = null;
  private readonly _popupStack: IPopupView[] = [];

  private _uiEvents: UIEvents | null = null;
  public world: IWorld | null = null;
  public hud: IHud | null = null;

  constructor(
    public readonly logger: ILogger,
    public readonly diContainer: DIContainer,
    public readonly viewDiContainer: TResolver,
  ) {}

  public setUIEvents(uiEvents: UIEvents): void {
    this._uiEvents = uiEvents;
    this._uiEvents.onCreateScreen((id, transition) => {
      this.handleCreateScreen(id, transition);
    });
    this._uiEvents.onCreatePopup((id) => {
      this.handleCreatePopup(id);
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
    Controller: ControllerCtor<TView, TController>,
  ): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- downcast to store in heterogeneous registry
    this._registry.set(View, Controller as ControllerCtor<any, any>);
  }

  public registerScreen<TView extends IScreenView, TController extends IViewController<TView>>(
    id: string,
    View: ViewCtor<TView>,
    Controller: ControllerCtor<TView, TController>,
  ): void {
    if (this._screenRegistry.has(id)) {
      const msg = `Screen already registered with id: ${id}`;
      this.logger.log(msg, LogTypes.Error);
      throw new Error(msg);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- downcast to store in heterogeneous registry
    this._screenRegistry.set(id, { View, Controller: Controller as ControllerCtor<any, any> });
  }

  public registerPopup<TView extends IPopupView, TController extends IViewController<TView>>(
    id: string,
    View: ViewCtor<TView>,
    Controller: ControllerCtor<TView, TController>,
  ): void {
    if (this._popupRegistry.has(id)) {
      const msg = `Popup already registered with id: ${id}`;
      this.logger.log(msg, LogTypes.Error);
      throw new Error(msg);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- downcast to store in heterogeneous registry
    this._popupRegistry.set(id, { View, Controller: Controller as ControllerCtor<any, any> });
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

  public viewAdded(_view: IView): void {}

  public viewRemoved(_view: IView): void {}

  private createWithController<TView extends IView>(
    View: ViewCtor<TView>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- retrieved from heterogeneous registry
    Controller: ControllerCtor<any, any>,
  ): TView {
    const view = new View() as TView;
    const controller = new Controller();

    view.setViewFactory(
      this,
      () => {
        view.inject(this.viewDiContainer);
        view.initialize();
        view.postInitialize();

        view.setController(controller);
        controller.inject(this.diContainer);
        controller.initialize(view);
      },
      () => {},
    );
    return view;
  }

  private handleCreateScreen(id: string, transition: ScreenTransition | null): void {
    const entry = this._screenRegistry.get(id);
    if (!entry) {
      const msg = `No screen registration for id: ${id}`;
      this.logger.log(msg, LogTypes.Error);
      throw new Error(msg);
    }

    const resolvedTransition = transition ?? this._defaultScreenTransition;
    if (this._activeScreen) {
      this._activeScreen.onExit?.(resolvedTransition);
      this._activeScreen = null;
    }

    const screen = this.createWithController(entry.View, entry.Controller) as IScreenView;
    if (!(screen instanceof HudViewBase)) {
      const msg = `Screen "${id}" must extend HudViewBase`;
      this.logger.log(msg, LogTypes.Error);
      throw new Error(msg);
    }
    this.hud?.addChild(HudLayer.Screen, screen);
    this._activeScreen = screen;
    this._activeScreen.onEnter?.(resolvedTransition);
  }

  private handleCreatePopup(id: string): void {
    const entry = this._popupRegistry.get(id);
    if (!entry) {
      const msg = `No popup registration for id: ${id}`;
      this.logger.log(msg, LogTypes.Error);
      throw new Error(msg);
    }

    const popupView = this.createWithController(entry.View, entry.Controller);
    if (!(popupView instanceof HudViewBase)) {
      const msg = `Popup "${id}" must extend HudViewBase`;
      this.logger.log(msg, LogTypes.Error);
      throw new Error(msg);
    }
    const popup = popupView as unknown as IPopupView;
    this.hud?.addChild(HudLayer.Popup, popupView);
    this._popupStack.push(popup);
    popup.onOpen?.();
  }

  private handleRemoveTopPopup(): void {
    const popup = this._popupStack.pop();
    if (!popup) return;
    const view = popup as HudViewBase;
    if (popup.onClose) {
      popup.onClose(() => {
        view.destroy();
      });
    } else {
      view.destroy();
    }
  }

  private handleRemoveAllPopups(): void {
    while (this._popupStack.length > 0) {
      const popup = this._popupStack.pop()!;
      const view = popup as HudViewBase;
      if (popup.onClose) {
        popup.onClose(() => {
          view.destroy();
        });
      } else {
        view.destroy();
      }
    }
  }
}
