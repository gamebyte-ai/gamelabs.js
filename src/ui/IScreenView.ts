import type { IView } from "../views/IView.js";
import type { ScreenTransition } from "./ScreenTransition.js";

/**
 * A lightweight "screen" contract for apps that swap high-level views (menus, gameplay, etc.).
 *
 * This intentionally stays minimal and framework-agnostic; screens can be Pixi, Three, DOM, or mixed.
 */
export interface IScreenView extends IView {
  /**
   * Optional hook called when the screen becomes active.
   * Use this for starting animations, subscribing to events, etc.
   */
  onEnter?(transition: ScreenTransition): void | Promise<void>;

  /**
   * Optional hook called when the screen is deactivated.
   * Use this for stopping animations, unsubscribing, etc.
   */
  onExit?(transition: ScreenTransition): void | Promise<void>;
}

