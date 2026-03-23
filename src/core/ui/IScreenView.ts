import type { IView } from "../views/IView.js";
import type { ScreenTransition } from "./ScreenTransition.js";

/**
 * Screen contract for apps that swap high-level views (menus, gameplay, etc.).
 * Extends `IView` so screens use the same lifecycle and ViewFactory wiring as other views.
 */
export interface IScreenView extends IView {
  /**
   * Optional hook called when the screen becomes active.
   * Use this for starting animations, subscribing to events, etc.
   */
  onEnter?(transition: ScreenTransition): void;

  /**
   * Optional hook called when the screen is deactivated.
   * Use this for stopping animations, unsubscribing, etc.
   */
  onExit?(transition: ScreenTransition): void;

  /**
   * Resize hook for screens.
   * Called by the app whenever the logical size or DPR changes.
   */
  onResize?(width: number, height: number, dpr: number): void;
}
