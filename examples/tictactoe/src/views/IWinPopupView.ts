import type { IPopupView, Unsubscribe } from "gamelabsjs";
import type { Team } from "../models/GameItem.js";

export interface IWinPopupView extends IPopupView {
  setResult(winner: Team | null): void;
  onPlayAgain(cb: () => void): Unsubscribe;
}
