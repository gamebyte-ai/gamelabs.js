import { InjectionToken } from "../../../../core/di/InjectionToken.js";
import type { Track } from "./Track.js";

/**
 * Read-only view of the timeline state.
 *
 * Holds the current timeline clock and the set of live tracks. Mutation
 * (advance time, add/remove tracks, allocate ids) goes through
 * `TimelineManager`; everyone else resolves `ITimelineModel` to query.
 */
export interface ITimelineModel {
  readonly currentTime: number;
  getTrack(uniqueId: number): Track | null;
  getTracksByType(type: string): Track[];
  getAllTracks(): Track[];
}

export const ITimelineModel = new InjectionToken<ITimelineModel>("ITimelineModel");
