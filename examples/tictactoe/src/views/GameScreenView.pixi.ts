import * as PIXI from "pixi.js";
import gsap from "gsap";
import { ScreenView, type Unsubscribe } from "gamelabsjs";
import type { IGameScreenView } from "./IGameScreenView";
import { Team } from "../models/GameItem.js";

export class GameScreenView extends ScreenView implements IGameScreenView {
  private static readonly TEXT_BASE = { fill: 0xe8eef6, fontSize: 18, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" };
  private static readonly TEXT_HIGHLIGHT_X = { fill: 0x60a5fa, fontSize: 20, fontWeight: "600" as const };
  private static readonly TEXT_HIGHLIGHT_O = { fill: 0xef4444, fontSize: 20, fontWeight: "600" as const };
  private static readonly POPUP_ANIM_DURATION = 0.3;

  private readonly _playerX = new PIXI.Text({ text: "Player X", style: { ...GameScreenView.TEXT_BASE } });
  private readonly _playerO = new PIXI.Text({ text: "Player O", style: { ...GameScreenView.TEXT_BASE } });
  private _activeTeam: Team = Team.X;

  private _popupRoot: PIXI.Container | null = null;
  private _popupBg: PIXI.Graphics | null = null;
  private _popupPanel: PIXI.Container | null = null;
  private _popupPanelBg: PIXI.Graphics | null = null;
  private _popupBtnBg: PIXI.Graphics | null = null;
  private _popupText: PIXI.Text | null = null;
  private _playAgainBtn: PIXI.Container | null = null;
  private _popupTween: gsap.core.Timeline | null = null;
  private readonly _playAgainListeners = new Set<() => void>();

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

  public showWinPopup(winner: Team): void {
    const label = winner === Team.X ? "Player X Wins!" : "Player O Wins!";
    const color = winner === Team.X ? 0x60a5fa : 0xef4444;
    this._showPopup(label, color);
  }

  public showDrawPopup(): void {
    this._showPopup("It's a Draw!", 0xe8eef6);
  }

  public hidePopup(): void {
    if (!this._popupRoot) return;

    this._killPopupTween();

    const root = this._popupRoot;
    const bg = this._popupBg;
    const panel = this._popupPanel;

    this._popupRoot = null;
    this._popupBg = null;
    this._popupPanel = null;
    this._popupPanelBg = null;
    this._popupBtnBg = null;
    this._popupText = null;
    this._playAgainBtn = null;

    const tl = gsap.timeline();
    tl.to(panel, { pixi: { scaleX: 0.8, scaleY: 0.8 }, alpha: 0, duration: GameScreenView.POPUP_ANIM_DURATION * 0.7, ease: "power2.in" }, 0);
    tl.to(bg, { alpha: 0, duration: GameScreenView.POPUP_ANIM_DURATION, ease: "power2.in" }, 0);
    tl.call(() => { root.destroy({ children: true }); });
    this._popupTween = tl;
  }

  public onPlayAgain(cb: () => void): Unsubscribe {
    this._playAgainListeners.add(cb);
    return () => this._playAgainListeners.delete(cb);
  }

  private _showPopup(label: string, color: number): void {
    this._destroyPopupImmediate();

    const root = new PIXI.Container();
    root.eventMode = "static";
    (root as any).layout = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%", justifyContent: "center", alignItems: "center" };

    // Semi-transparent backdrop
    const bg = new PIXI.Graphics();
    (bg as any).layout = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" };
    bg.eventMode = "static";
    bg.alpha = 0;
    root.addChild(bg);

    // Panel (Container wrapper with Graphics background)
    const panel = new PIXI.Container();
    (panel as any).layout = { width: 280, height: 160, flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 20 };
    panel.alpha = 0;
    panel.scale.set(0.8, 0.8);

    const panelBg = new PIXI.Graphics();
    (panelBg as any).layout = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" };
    panel.addChild(panelBg);

    root.addChild(panel);

    // Winner text
    const text = new PIXI.Text({
      text: label,
      style: { fill: color, fontSize: 24, fontWeight: "700", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }
    });
    text.anchor.set(0.5, 0.5);
    (text as any).layout = {};
    panel.addChild(text);

    // Play Again button
    const btn = new PIXI.Container();
    btn.eventMode = "static";
    (btn as any).cursor = "pointer";
    (btn as any).layout = { width: 160, height: 40, justifyContent: "center", alignItems: "center" };

    const btnBg = new PIXI.Graphics();
    (btnBg as any).layout = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" };
    btn.addChild(btnBg);

    const btnText = new PIXI.Text({
      text: "Play Again",
      style: { fill: 0xe8eef6, fontSize: 16, fontWeight: "600", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }
    });
    btnText.anchor.set(0.5, 0.5);
    (btnText as any).layout = {};
    btn.addChild(btnText);

    btn.on("pointertap", () => {
      for (const cb of this._playAgainListeners) cb();
    });

    panel.addChild(btn);

    this.addChild(root);

    this._popupRoot = root;
    this._popupBg = bg;
    this._popupPanel = panel;
    this._popupPanelBg = panelBg;
    this._popupBtnBg = btnBg;
    this._popupText = text;
    this._playAgainBtn = btn;

    this._drawPopupGraphics();

    // Animate in
    this._killPopupTween();
    const tl = gsap.timeline();
    tl.to(bg, { alpha: 1, duration: GameScreenView.POPUP_ANIM_DURATION, ease: "power2.out" }, 0);
    tl.to(panel, { pixi: { scaleX: 1, scaleY: 1 }, alpha: 1, duration: GameScreenView.POPUP_ANIM_DURATION, ease: "back.out(1.4)" }, 0.05);
    this._popupTween = tl;
  }

  private _killPopupTween(): void {
    if (this._popupTween) {
      this._popupTween.kill();
      this._popupTween = null;
    }
  }

  private _destroyPopupImmediate(): void {
    this._killPopupTween();
    if (this._popupRoot) {
      this._popupRoot.destroy({ children: true });
      this._popupRoot = null;
      this._popupBg = null;
      this._popupPanel = null;
      this._popupPanelBg = null;
      this._popupBtnBg = null;
      this._popupText = null;
      this._playAgainBtn = null;
    }
  }

  private _drawPopupGraphics(): void {
    const w = (this as any).layout?.width ?? 400;
    const h = (this as any).layout?.height ?? 300;

    if (this._popupBg) {
      this._popupBg.clear();
      this._popupBg.rect(0, 0, Math.max(1, w), Math.max(1, h));
      this._popupBg.fill({ color: 0x000000, alpha: 0.6 });
    }

    if (this._popupPanelBg) {
      this._popupPanelBg.clear();
      this._popupPanelBg.roundRect(0, 0, 280, 160, 12);
      this._popupPanelBg.fill({ color: 0x111827, alpha: 0.95 });
      this._popupPanelBg.stroke({ color: 0x334155, width: 1 });
    }

    if (this._popupBtnBg) {
      this._popupBtnBg.clear();
      this._popupBtnBg.roundRect(0, 0, 160, 40, 8);
      this._popupBtnBg.fill({ color: 0x334155 });
    }
  }

  private _updateHighlight(): void {
    const baseStyle = { ...GameScreenView.TEXT_BASE };
    const highlightX = { ...GameScreenView.TEXT_BASE, ...GameScreenView.TEXT_HIGHLIGHT_X };
    const highlightO = { ...GameScreenView.TEXT_BASE, ...GameScreenView.TEXT_HIGHLIGHT_O };
    (this._playerX as PIXI.Text).style = this._activeTeam === Team.X ? highlightX as any : baseStyle as any;
    (this._playerO as PIXI.Text).style = this._activeTeam === Team.O ? highlightO as any : baseStyle as any;
  }

  override onResize(width: number, height: number, _dpr: number): void {
    (this as any).layout = { width: Math.max(1, width), height: Math.max(1, height) };
    this._drawPopupGraphics();
  }

  public override preDestroy(): void {
    this._playAgainListeners.clear();
    this._destroyPopupImmediate();
  }
}
