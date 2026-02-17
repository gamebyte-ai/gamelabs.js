import type { IScreen, IView } from "gamelabsjs";

/**
 * Example01 "gameplay" screen contract.
 *
 * For now this is just a resize-aware screen view, but it gives us a stable
 * place to add screen-specific APIs later (HUD hooks, overlays, etc.).
 */
export interface IGameScreenView extends IView, IScreen {
}

