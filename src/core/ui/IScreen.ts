import type { ScreenTransition } from "./ScreenTransition.js";

/**
 * A lightweight "screen" contract for apps that swap high-level views (menus, gameplay, etc.).
 *
 * This intentionally stays minimal and framework-agnostic; screens can be Pixi, Three, DOM, or mixed.
 *
 * Note: `IScreen` is intentionally NOT an `IView`. Screen implementations are expected to also
 * implement `IView` separately when they participate in the View/Controller system.
 */
export interface IScreen {
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

  /**
   * Resize hook for screens.
   * Called by the app whenever the logical size or DPR changes.
   */
  onResize?(width: number, height: number, dpr: number): void;
}

