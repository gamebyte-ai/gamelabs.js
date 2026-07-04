import { InjectionToken } from "../di/InjectionToken.js";
import type { SafeAreaInsets } from "../utilities/safeAreaInsets.js";

/**
 * Read-only view of app-wide state.
 *
 * Views and modules depend on this interface rather than the concrete
 * `GamelabsApp` to keep the write path encapsulated on the app itself.
 * Use `AppEvents` to react to changes.
 */
export interface IApp {
  /** Current logical width (not DPR-scaled). */
  readonly width: number;
  /** Current logical height (not DPR-scaled). */
  readonly height: number;
  /** Current device pixel ratio. */
  readonly dpr: number;
  /**
   * Current safe-area insets, canvas-relative in logical px. Frozen snapshot,
   * replaced on every resize pass — read live rather than caching the reference.
   */
  readonly safeAreaInsets: SafeAreaInsets;
}

export const IApp = new InjectionToken<IApp>("IApp");
