import type { IScreen } from "../../../../core/ui/IScreen.js";
import type { IView } from "../../../../core/views/IView.js";

/**
 * Example02 level progress screen contract.
 */
export interface ILevelProgressScreenView extends IView, IScreen {

  /**
   * Sets the current level number (1-indexed).
   */
  setCurrentLevel(level: number): void;

  /**
   * Configures how many items are shown (default: 5).
   */
  setVisibleCount(count: number): void;

  /**
   * Fired when the current level item is clicked.
   */
  onCurrentLevelClick(cb: () => void): () => void;

  /**
   * Fired when the back button is clicked.
   */
  onBackClick(cb: () => void): () => void;
}

