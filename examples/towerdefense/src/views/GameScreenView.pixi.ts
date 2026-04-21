import * as PIXI from "pixi.js";
import { ButtonComponent, ScreenView, type Unsubscribe } from "@gamebyte/gamelabsjs";
import type { IGameScreenView } from "./IGameScreenView.js";
import { TowerTypeId, TOWER_TYPES } from "../constants/TowerTypeDef.js";

/**
 * HUD for the tower defense game.
 *
 * - Top bar: "Generate Level" button + gold display.
 * - Bottom bar: tower shop cards showing name, cost, and greying out
 *   when the player cannot afford them.
 */
export class GameScreenView extends ScreenView implements IGameScreenView {
  private static readonly BTN_W = 150;
  private static readonly BTN_H = 36;
  private static readonly SHOP_CARD_W = 140;
  private static readonly SHOP_CARD_H = 52;

  private readonly overlay = new PIXI.Graphics();
  private _generateHandler: (() => void) | null = null;
  private _buyHandler: ((type: TowerTypeId) => void) | null = null;
  private _goldText: PIXI.Text | null = null;
  private _statsText: PIXI.Text | null = null;
  private readonly _towerCards: { card: ButtonComponent; cost: number }[] = [];
  private readonly _settingsListeners = new Set<() => void>();

  public override postInitialize(): void {
    (this as any).layout = {
      width: 1,
      height: 1,
      flexDirection: "column",
      justifyContent: "space-between",
      padding: 12,
      gap: 8,
    };

    (this.overlay as any).layout = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" };
    (this.overlay as any).eventMode = "none";
    if (!this.overlay.parent) this.addChild(this.overlay);

    this._createTopBar();
    this._createTowerShop();
  }

  public setGenerateLevelHandler(handler: (() => void) | null): void {
    this._generateHandler = handler;
  }

  public setBuyTowerHandler(handler: ((type: TowerTypeId) => void) | null): void {
    this._buyHandler = handler;
  }

  public updateGold(amount: number): void {
    if (this._goldText) this._goldText.text = `Gold: ${amount}`;
  }

  public updateStats(kills: number, waveNumber: number): void {
    if (this._statsText) this._statsText.text = `Kills: ${kills}  Wave: ${waveNumber}`;
  }

  public updateTowerAffordability(currentGold: number): void {
    for (const entry of this._towerCards) {
      const canAfford = currentGold >= entry.cost;
      entry.card.alpha = canAfford ? 1 : 0.4;
      entry.card.eventMode = canAfford ? "static" : "none";
    }
  }

  public override onResize(width: number, height: number, _dpr: number): void {
    (this as any).layout = { width: Math.max(1, width), height: Math.max(1, height) };
    this.overlay.clear();
    this.overlay.rect(0, 0, Math.max(1, width), Math.max(1, height)).fill({ color: 0x000000, alpha: 0 });
  }

  public override preDestroy(): void {
    this._generateHandler = null;
    this._buyHandler = null;
    this._towerCards.length = 0;
    this._settingsListeners.clear();
  }

  // ── Top bar ───────────────────────────────────────────────────────────

  private _createTopBar(): void {
    const row = new PIXI.Container();
    (row as any).layout = { flexDirection: "row", gap: 16, alignItems: "center" };

    const generateBtn = new ButtonComponent({
      width: GameScreenView.BTN_W,
      height: GameScreenView.BTN_H,
      label: "Generate Level",
      labelStyle: { fontSize: 14, fontWeight: "600", fill: 0xffffff },
      radius: 6,
      fillColor: 0x4488cc,
      strokeColor: 0x5599dd,
    });
    generateBtn.onPress(() => this._generateHandler?.());
    row.addChild(generateBtn);

    this._goldText = new PIXI.Text({
      text: "Gold: 0",
      style: { fontSize: 16, fontFamily: "Arial, sans-serif", fill: 0xffdd44, fontWeight: "bold" },
    });
    (this._goldText as any).layout = { height: GameScreenView.BTN_H };
    row.addChild(this._goldText);

    this._statsText = new PIXI.Text({
      text: "Kills: 0  Wave: 1",
      style: { fontSize: 14, fontFamily: "Arial, sans-serif", fill: 0xccddee, fontWeight: "600" },
    });
    (this._statsText as any).layout = { height: GameScreenView.BTN_H };
    row.addChild(this._statsText);

    // Settings gear button
    const settingsBtn = new ButtonComponent({
      width: 36,
      height: 36,
      label: "\u2699",
      labelStyle: { fontSize: 20, fill: 0xcbd5e0 },
      radius: 8,
      fillColor: 0x1e293b,
      fillAlpha: 0.7,
      strokeColor: 0x475569,
    });
    settingsBtn.onPress(() => {
      for (const cb of this._settingsListeners) cb();
    });
    row.addChild(settingsBtn);

    this.addChild(row);
  }

  public onSettingsTapped(cb: () => void): Unsubscribe {
    this._settingsListeners.add(cb);
    return () => this._settingsListeners.delete(cb);
  }

  // ── Tower shop ────────────────────────────────────────────────────────

  private _createTowerShop(): void {
    const bar = new PIXI.Container();
    (bar as any).layout = { flexDirection: "row", justifyContent: "center", gap: 12 };

    for (const [typeId, typeDef] of TOWER_TYPES) {
      const card = this._makeTowerCard(typeId, typeDef.name, typeDef.cost, typeDef.color);
      this._towerCards.push({ card, cost: typeDef.cost });
      bar.addChild(card);
    }

    this.addChild(bar);
  }

  private _makeTowerCard(typeId: TowerTypeId, name: string, cost: number, color: number): ButtonComponent {
    const { SHOP_CARD_W, SHOP_CARD_H } = GameScreenView;

    const card = new ButtonComponent({
      width: SHOP_CARD_W,
      height: SHOP_CARD_H,
      radius: 6,
      fillColor: color,
      fillAlpha: 0.85,
      strokeColor: 0x000000,
      strokeWidth: 0,
    });

    const nameText = new PIXI.Text({
      text: name,
      style: { fontSize: 14, fontFamily: "Arial, sans-serif", fill: 0xffffff, fontWeight: "bold" },
    });
    nameText.anchor.set(0.5, 0);
    nameText.position.set(SHOP_CARD_W / 2, 6);
    card.addChild(nameText);

    const costText = new PIXI.Text({
      text: `${cost}g`,
      style: { fontSize: 12, fontFamily: "Arial, sans-serif", fill: 0xffdd44 },
    });
    costText.anchor.set(0.5, 0);
    costText.position.set(SHOP_CARD_W / 2, 28);
    card.addChild(costText);

    card.onPress(() => this._buyHandler?.(typeId));

    return card;
  }
}
