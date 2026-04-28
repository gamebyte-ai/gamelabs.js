import type { IView, Unsubscribe } from "@gamebyte/gamelabsjs";
import type { ScrollViewDirectionPreset } from "../constants/DemoPresets.js";

/**
 * Live preview surface for the ScrollView demo. The view owns the
 * `ScrollViewComponent` and a flat grid of demo items inside its
 * `content` container. Constructor-only props (direction /
 * showScrollbar / wheelSpeed) rebuild the underlying component;
 * `setItemCount` mutates the existing content in place and refreshes
 * the scroll bounds.
 */
export interface IScrollViewDemoView extends IView {
  setDirection(direction: ScrollViewDirectionPreset): void;
  setItemCount(count: number): void;
  setShowScrollbar(visible: boolean): void;
  setWheelSpeed(speed: number): void;
  /** Programmatically scroll to (0, 0). */
  scrollToStart(): void;
  /** Programmatically scroll to the bottom-right of the scrollable range. */
  scrollToEnd(): void;
  setOutlineVisible(visible: boolean): void;
  /** Fires whenever the live scroll offset changes (user-driven OR programmatic). */
  onScroll(cb: (x: number, y: number) => void): Unsubscribe;
}
