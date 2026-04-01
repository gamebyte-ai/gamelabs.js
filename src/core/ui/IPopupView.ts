import type { IView } from "../views/IView.js";

/**
 * Popup contract for stackable overlay views (dialogs, confirmations, etc.).
 * Extends `IView` so popups use the same lifecycle and ViewFactory wiring as other views.
 */
export interface IPopupView extends IView {
  /**
   * Called when the popup is added to the stack and becomes visible.
   */
  onOpen?(): void;

  /**
   * Called when the popup is removed from the stack.
   * The popup must call `done()` when it has finished its close transition
   * so the framework can destroy it.
   */
  onClose?(done: () => void): void;

  /**
   * Resize hook for popups.
   * Called by the app whenever the logical size or DPR changes.
   */
  onResize?(width: number, height: number, dpr: number): void;
}
