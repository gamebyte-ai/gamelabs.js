import type { IScreenView } from "@gamebyte/gamelabsjs";

/**
 * Game screen surface in the Pixi HUD layer.
 *
 * Step 1 owns the title label only. Score, level, and end-state
 * widgets land in later steps alongside the rules that drive them.
 */
export interface IGameScreenView extends IScreenView {}
