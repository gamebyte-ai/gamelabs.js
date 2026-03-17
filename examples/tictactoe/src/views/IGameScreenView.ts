import type { IScreen, IView } from "gamelabsjs";
import type { Team } from "../models/GameItem.js";

export interface IGameScreenView extends IView, IScreen {
  setActiveTeam(team: Team): void;
}
