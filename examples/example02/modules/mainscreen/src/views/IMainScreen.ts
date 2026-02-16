import type { IScreenView } from "gamelabsjs";

/**
 * Example02 main HUD screen contract.
 * Kept empty for now; add screen-specific APIs as needed.
 */
export interface IMainScreen extends IScreenView {
  onPlayClick(cb: () => void): () => void;
  resize(width: number, height: number): void;
}

