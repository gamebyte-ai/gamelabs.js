import type { IView } from "@gamebyte/gamelabsjs";
import type { BubbleColor } from "../constants/BubbleColor";

/**
 * Transient pop feedback — particle bursts and floating score popups.
 * Both are driven by `onBubblePopped`; both have their own animated
 * lifetimes that the view ticks per frame.
 */
export interface IEffectsView extends IView {
  playPopBurst(x: number, y: number, color: BubbleColor): void;
  playScorePopup(x: number, y: number, color: BubbleColor, points: number): void;
  updateParticles(dt: number): void;
  updateScorePopups(dt: number): void;
}
