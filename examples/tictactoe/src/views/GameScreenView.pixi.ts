import * as PIXI from "pixi.js";
import { ScreenView } from "gamelabsjs";
import type { IGameScreenView } from "./IGameScreenView";
import { Team } from "../models/GameItem.js";

export class GameScreenView extends ScreenView implements IGameScreenView {
  private static readonly TEXT_BASE = { fill: 0xe8eef6, fontSize: 18, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" };
  private static readonly TEXT_HIGHLIGHT = { fill: 0x60a5fa, fontSize: 20, fontWeight: "600" as const };

  private readonly _playerX = new PIXI.Text({ text: "Player X", style: { ...GameScreenView.TEXT_BASE } });
  private readonly _playerO = new PIXI.Text({ text: "Player O", style: { ...GameScreenView.TEXT_BASE } });
  private _activeTeam: Team = Team.X;

  public postInitialize(): void {
    (this as any).layout = {
      width: 1,
      height: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      padding: 16,
      alignItems: "flex-start"
    };

    (this._playerX as any).layout = {};
    (this._playerO as any).layout = {};
    this.addChild(this._playerX);
    this.addChild(this._playerO);
    this._updateHighlight();
  }

  public setActiveTeam(team: Team): void {
    this._activeTeam = team;
    this._updateHighlight();
  }

  private _updateHighlight(): void {
    const baseStyle = { ...GameScreenView.TEXT_BASE };
    const highlightStyle = { ...GameScreenView.TEXT_BASE, ...GameScreenView.TEXT_HIGHLIGHT };
    (this._playerX as PIXI.Text).style = this._activeTeam === Team.X ? highlightStyle as any : baseStyle as any;
    (this._playerO as PIXI.Text).style = this._activeTeam === Team.O ? highlightStyle as any : baseStyle as any;
  }

  override onResize(width: number, height: number, _dpr: number): void {
    (this as any).layout = { width: Math.max(1, width), height: Math.max(1, height) };
  }
}
