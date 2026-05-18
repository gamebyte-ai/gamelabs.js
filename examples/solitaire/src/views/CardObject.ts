import * as THREE from "three";
import type { ICard } from "../models/Card";
import { SUIT_SYMBOL } from "../constants/Suit";
import { SuitRules } from "../utilities/SuitRules";
import { RANK_LABEL } from "../constants/Rank";

export interface CardVisualConfig {
  readonly width: number;
  readonly height: number;
  readonly backColor: number;
  readonly faceBackground: number;
  readonly redColor: number;
  readonly blackColor: number;
}

const FACE_LIFT_Y = 0.02;

/**
 * Visual for a single card — two planes (front + back) on the XZ plane, one
 * shown at a time based on faceUp state. No game logic. Cards live as
 * children of the BoardView, positioned by the layout's stackingOffset.
 */
export class CardObject extends THREE.Group {
  public readonly cardId: number;

  private readonly _front: THREE.Mesh;
  private readonly _back: THREE.Mesh;
  private readonly _frontTexture: THREE.CanvasTexture;
  private readonly _backTexture: THREE.CanvasTexture;

  public constructor(card: ICard, config: CardVisualConfig) {
    super();
    this.cardId = card.id;
    this.name = `Card(${card.id})`;

    const geometry = new THREE.PlaneGeometry(config.width, config.height);

    this._frontTexture = CardObject.createFrontTexture(card, config);
    const frontMaterial = new THREE.MeshBasicMaterial({
      map: this._frontTexture,
      transparent: false,
      side: THREE.DoubleSide,
    });
    this._front = new THREE.Mesh(geometry, frontMaterial);
    this._front.rotation.x = -Math.PI / 2;
    this._front.position.y = FACE_LIFT_Y;
    this._front.userData = { cardId: card.id };
    this.add(this._front);

    this._backTexture = CardObject.createBackTexture(config);
    const backMaterial = new THREE.MeshBasicMaterial({
      map: this._backTexture,
      transparent: false,
      side: THREE.DoubleSide,
    });
    this._back = new THREE.Mesh(geometry, backMaterial);
    this._back.rotation.x = -Math.PI / 2;
    this._back.position.y = FACE_LIFT_Y;
    this._back.userData = { cardId: card.id };
    this.add(this._back);

    this.setFaceUp(card.faceUp);
  }

  public setFaceUp(faceUp: boolean): void {
    this._front.visible = faceUp;
    this._back.visible = !faceUp;
  }

  /** Meshes the parent view should include in pointer raycasts. Face-down
   *  cards return an empty list so they cannot be picked up. */
  public getPickableMeshes(): readonly THREE.Mesh[] {
    return this._front.visible ? [this._front] : [];
  }

  /** Meshes for drop-target hit-testing — whichever face is currently
   *  visible. Unlike {@link getPickableMeshes}, face-down cards still
   *  contribute because the user may legitimately drop on them. */
  public getHitTestMeshes(): readonly THREE.Mesh[] {
    if (this._front.visible) return [this._front];
    if (this._back.visible) return [this._back];
    return [];
  }

  public dispose(): void {
    this._front.geometry.dispose();
    (this._front.material as THREE.Material).dispose();
    this._back.geometry.dispose();
    (this._back.material as THREE.Material).dispose();
    this._frontTexture.dispose();
    this._backTexture.dispose();
  }

  private static createFrontTexture(card: ICard, config: CardVisualConfig): THREE.CanvasTexture {
    const W = 256;
    const H = Math.round(W * (config.height / config.width));
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("CardObject: 2d canvas context unavailable");

    const bgHex = `#${config.faceBackground.toString(16).padStart(6, "0")}`;
    const colorHex = `#${(SuitRules.isRed(card.suit) ? config.redColor : config.blackColor).toString(16).padStart(6, "0")}`;
    const rankLabel = RANK_LABEL[card.rank];
    const suitSymbol = SUIT_SYMBOL[card.suit];

    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 4;
    const r = 16;
    ctx.beginPath();
    ctx.moveTo(r, 2);
    ctx.lineTo(W - r, 2);
    ctx.quadraticCurveTo(W - 2, 2, W - 2, r);
    ctx.lineTo(W - 2, H - r);
    ctx.quadraticCurveTo(W - 2, H - 2, W - r, H - 2);
    ctx.lineTo(r, H - 2);
    ctx.quadraticCurveTo(2, H - 2, 2, H - r);
    ctx.lineTo(2, r);
    ctx.quadraticCurveTo(2, 2, r, 2);
    ctx.stroke();

    ctx.fillStyle = colorHex;
    ctx.font = "bold 56px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(rankLabel, 18, 18);
    ctx.font = "44px sans-serif";
    ctx.fillText(suitSymbol, 22, 76);

    ctx.font = "bold 56px sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.save();
    ctx.translate(W - 18, H - 18);
    ctx.rotate(Math.PI);
    ctx.fillText(rankLabel, 0, 0);
    ctx.font = "44px sans-serif";
    ctx.fillText(suitSymbol, 0, -60);
    ctx.restore();

    ctx.font = "bold 140px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(suitSymbol, W / 2, H / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }

  private static createBackTexture(config: CardVisualConfig): THREE.CanvasTexture {
    const W = 128;
    const H = Math.round(W * (config.height / config.width));
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("CardObject: 2d canvas context unavailable");

    const bg = `#${config.backColor.toString(16).padStart(6, "0")}`;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, W - 12, H - 12);

    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1.5;
    const step = 14;
    for (let i = -H; i < W + H; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + H, H);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }
}
