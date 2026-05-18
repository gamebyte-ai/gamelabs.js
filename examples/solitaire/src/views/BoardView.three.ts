import * as THREE from "three";
import { WorldViewBase } from "@gamebyte/gamelabsjs";
import type { BoardRenderInput, IBoardView } from "./IBoardView";
import type { BoardLayoutConfig } from "../models/SlotConfig";
import { SlotObject } from "./SlotObject";
import { CardObject, type CardVisualConfig } from "./CardObject";
import type { ISlot } from "../models/Slot";

const CARD_STACK_LIFT_Y = 0.001;

export class BoardView extends WorldViewBase implements IBoardView {
  private _slotsRoot: THREE.Group | null = null;
  private _cardsRoot: THREE.Group | null = null;
  private readonly _slotObjects: SlotObject[] = [];
  private readonly _cardObjects: CardObject[] = [];

  public override postInitialize(): void {
    super.postInitialize();

    const scene = this.parent;
    if (scene instanceof THREE.Scene) {
      scene.fog = new THREE.Fog(0x0b0f14, 15, 50);
      if (!scene.getObjectByName("Solitaire.AmbientLight")) {
        const ambient = new THREE.AmbientLight(0xffffff, 1);
        ambient.name = "Solitaire.AmbientLight";
        scene.add(ambient);
      }
    }

    this._slotsRoot = new THREE.Group();
    this._slotsRoot.name = "Solitaire.SlotsRoot";
    this.add(this._slotsRoot);

    this._cardsRoot = new THREE.Group();
    this._cardsRoot.name = "Solitaire.CardsRoot";
    this.add(this._cardsRoot);
  }

  public setBoard(input: BoardRenderInput): void {
    this.clearSlots();
    this.clearCards();
    if (!this._slotsRoot || !this._cardsRoot) return;

    const { layout, slots, palettes, cardVisual } = input;
    const boardWidth = layout.columnCount * layout.slotWidth + (layout.columnCount - 1) * layout.slotGapX;
    const boardHeight = layout.rowCount * layout.slotHeight + (layout.rowCount - 1) * layout.slotGapZ;
    const originX = -boardWidth / 2 + layout.slotWidth / 2;
    const originZ = -boardHeight / 2 + layout.slotHeight / 2;

    for (const slot of slots) {
      const worldX = originX + slot.config.position.col * (layout.slotWidth + layout.slotGapX);
      const worldZ = originZ + slot.config.position.row * (layout.slotHeight + layout.slotGapZ);

      const slotObject = this.createSlotObject(slot, layout, palettes);
      slotObject.position.set(worldX, 0, worldZ);
      this._slotsRoot.add(slotObject);
      this._slotObjects.push(slotObject);

      this.renderCards(slot, worldX, worldZ, cardVisual);
    }
  }

  private renderCards(slot: ISlot, slotWorldX: number, slotWorldZ: number, cardVisual: CardVisualConfig): void {
    if (!this._cardsRoot) return;
    const offset = slot.config.rules.stackingOffset;
    for (let i = 0; i < slot.cards.length; i++) {
      const card = slot.cards[i];
      const cardObject = new CardObject(card, cardVisual);
      cardObject.position.set(slotWorldX + offset.x * i, CARD_STACK_LIFT_Y * (i + 1), slotWorldZ + offset.z * i);
      this._cardsRoot.add(cardObject);
      this._cardObjects.push(cardObject);
    }
  }

  private createSlotObject(slot: ISlot, layout: BoardLayoutConfig, palettes: BoardRenderInput["palettes"]): SlotObject {
    return new SlotObject({
      config: slot.config,
      width: layout.slotWidth,
      height: layout.slotHeight,
      palette: palettes[slot.config.type],
    });
  }

  private clearSlots(): void {
    for (const slotObject of this._slotObjects) {
      slotObject.removeFromParent();
      slotObject.dispose();
    }
    this._slotObjects.length = 0;
  }

  private clearCards(): void {
    for (const cardObject of this._cardObjects) {
      cardObject.removeFromParent();
      cardObject.dispose();
    }
    this._cardObjects.length = 0;
  }

  public override preDestroy(): void {
    this.clearSlots();
    this.clearCards();
    if (this._slotsRoot) {
      this._slotsRoot.removeFromParent();
      this._slotsRoot = null;
    }
    if (this._cardsRoot) {
      this._cardsRoot.removeFromParent();
      this._cardsRoot = null;
    }
    super.preDestroy();
  }
}
