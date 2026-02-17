import type { IScreen, IView } from "gamelabsjs";

/**
 * Example02 main HUD screen contract.
 * Kept empty for now; add screen-specific APIs as needed.
 */
export interface IMainScreenView extends IView, IScreen {
  onPlayClick(cb: () => void): () => void;
  onSettingsClick(cb: () => void): () => void;
  onResize(width: number, height: number, dpr: number): void;
}

