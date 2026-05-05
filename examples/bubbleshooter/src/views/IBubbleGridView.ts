import type { IView } from "@gamebyte/gamelabsjs";
import type { BubbleColor } from "../constants/BubbleColor";

/**
 * The cluster grid — placed bubbles in the hex matrix plus the
 * jelly-wobble snap shake that ripples through neighbouring bubbles
 * after a fired bubble lands.
 */
export interface IBubbleGridView extends IView {
  setBubble(row: number, col: number, color: BubbleColor): void;
  removeBubble(row: number, col: number): void;
  playSnapShake(row: number, col: number): void;
  updateBubbleShakes(dt: number): void;
}
