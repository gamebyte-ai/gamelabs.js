import type { IScreenView } from "gamelabsjs";
import type { Team } from "../models/GameItem.js";

export interface IGameScreenView extends IScreenView {
  setActiveTeam(team: Team): void;
}
