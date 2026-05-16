import * as THREE from "three";
import { WorldViewBase } from "@gamebyte/gamelabsjs";
import type { IBoardView } from "./IBoardView";
import type { BoardLayoutConfig, SlotConfig } from "../models/SlotConfig";
import type { SlotType } from "../constants/SlotType";
import { SlotObject, type SlotPalette } from "./SlotObject";

export class BoardView extends WorldViewBase implements IBoardView {
  private _slotsRoot: THREE.Group | null = null;
  private readonly _slotObjects: SlotObject[] = [];

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
  }

  public setLayout(layout: BoardLayoutConfig, palettes: Readonly<Record<SlotType, SlotPalette>>): void {
    this.clearSlots();
    if (!this._slotsRoot) return;

    const boardWidth = layout.columnCount * layout.slotWidth + (layout.columnCount - 1) * layout.slotGapX;
    const boardHeight = layout.rowCount * layout.slotHeight + (layout.rowCount - 1) * layout.slotGapZ;
    const originX = -boardWidth / 2 + layout.slotWidth / 2;
    const originZ = -boardHeight / 2 + layout.slotHeight / 2;

    for (const slot of layout.slots) {
      const slotObject = this.createSlot(slot, layout, palettes);
      const worldX = originX + slot.position.col * (layout.slotWidth + layout.slotGapX);
      const worldZ = originZ + slot.position.row * (layout.slotHeight + layout.slotGapZ);
      slotObject.position.set(worldX, 0, worldZ);
      this._slotsRoot.add(slotObject);
      this._slotObjects.push(slotObject);
    }
  }

  private createSlot(slot: SlotConfig, layout: BoardLayoutConfig, palettes: Readonly<Record<SlotType, SlotPalette>>): SlotObject {
    return new SlotObject({
      config: slot,
      width: layout.slotWidth,
      height: layout.slotHeight,
      palette: palettes[slot.type],
    });
  }

  private clearSlots(): void {
    for (const slotObject of this._slotObjects) {
      slotObject.removeFromParent();
      slotObject.dispose();
    }
    this._slotObjects.length = 0;
  }

  public override preDestroy(): void {
    this.clearSlots();
    if (this._slotsRoot) {
      this._slotsRoot.removeFromParent();
      this._slotsRoot = null;
    }
    super.preDestroy();
  }
}
