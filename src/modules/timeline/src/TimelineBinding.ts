import { ModuleBinding } from "../../../core/ModuleBinding.js";
import type { DIContainer } from "../../../core/di/DIContainer.js";

import { ITimelineModel } from "./models/ITimelineModel.js";
import { TimelineModel } from "./models/TimelineModel.js";
import { TimelineEvents } from "./events/TimelineEvents.js";
import { TimelineManager } from "./utilities/TimelineManager.js";

/**
 * Module binding for the timeline subsystem.
 *
 * Binds:
 *   - `TimelineModel` (also under `ITimelineModel`) — read-only state
 *     for controllers and other observers
 *   - `TimelineEvents` — track lifecycle event bus
 *   - `TimelineManager` — owns the model mutation; resolved by code
 *     that adds/cancels tracks
 *
 * No views, no assets — this module is pure runtime logic.
 *
 * The app must drive the timeline by calling
 * `timelineManager.update(dtSeconds)` from its `onStep` hook (mirroring
 * the `GameCameraManager.update` wiring pattern). The binding does not
 * auto-register with `UpdateManager` so the app keeps control of
 * ordering — typically tick the timeline before the camera so tracks
 * can write camera offsets before the camera applies them.
 */
export class TimelineBinding extends ModuleBinding {
  public configureDI(diContainer: DIContainer, _viewDiContainer: DIContainer): void {
    const model = new TimelineModel();
    const events = new TimelineEvents();
    diContainer.bindInstance(TimelineModel, model, [ITimelineModel]);
    diContainer.bindInstance(TimelineEvents, events);
    diContainer.bindInstance(TimelineManager, new TimelineManager(model, events));
  }
}
