import type { IScreenView, Unsubscribe } from "@gamebyte/gamelabsjs";

export interface IGameScreenView extends IScreenView {
  onLevelChanged(cb: (levelId: string) => void): Unsubscribe;
}
