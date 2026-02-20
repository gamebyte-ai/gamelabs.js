import type { IScreen } from "../../../../core/ui/IScreen.js";
import type { IView } from "../../../../core/views/IView.js";

/**
 * Example02 main HUD screen contract.
 * Kept empty for now; add screen-specific APIs as needed.
 */
export interface IMainScreenView extends IView, IScreen {
  onPlayClick(cb: () => void): () => void;
  onSettingsClick(cb: () => void): () => void;
}

