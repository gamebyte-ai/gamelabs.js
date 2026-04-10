import type { IScreenView } from "../../../../core/ui/IScreenView.js";

/**
 * Screens main HUD screen contract.
 * Kept empty for now; add screen-specific APIs as needed.
 */
export interface IMainScreenView extends IScreenView {
  onPlayClick(cb: () => void): () => void;
  onSettingsClick(cb: () => void): () => void;
}
