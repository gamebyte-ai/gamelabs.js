import type { IScreenView } from "@gamebyte/gamelabsjs";

/**
 * HUD overlay for the in-game screen. Single level, no controls — just a
 * title/subtitle so the player knows what they're playing.
 */
export interface IGameScreenView extends IScreenView {
  setTitle(title: string): void;
  setSubtitle(subtitle: string): void;
}
