import { InjectionToken } from "../di/InjectionToken.js";
import type { HostEvent } from "./HostEvent.js";
import type { SafeAreaInsets } from "../utilities/safeAreaInsets.js";

/**
 * Read-only view of app-wide state, plus the outbound `informHost` signal.
 *
 * Views and modules depend on this interface rather than the concrete
 * `GamelabsApp` to keep the write path encapsulated on the app itself.
 * Use `AppEvents` to react to changes.
 *
 * `informHost` is included here (not on `AppEvents`) because it is a one-way
 * outbound signal from game code to the deploy target — read-only from any
 * subscriber's perspective. Consumers never observe or subscribe to it.
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
  /** Signal a canonical lifecycle / CTA event to the deploy-target host. */
  informHost(event: HostEvent): void;
}

export const IApp = new InjectionToken<IApp>("IApp");
