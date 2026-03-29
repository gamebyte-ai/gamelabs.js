import type { IScreenView, Unsubscribe } from "gamelabsjs";
import type { Team } from "../models/GameItem.js";

export interface IGameScreenView extends IScreenView {
  setActiveTeam(team: Team): void;
  showWinPopup(winner: Team): void;
  showDrawPopup(): void;
  hidePopup(): void;
  onPlayAgain(cb: () => void): Unsubscribe;
}
