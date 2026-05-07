import type { Unsubscribe } from "../../../../core/events/subscriptions.js";
import type { Track } from "../models/Track.js";

/**
 * Cross-cutting observers for `TimelineManager` track lifecycle.
 *
 * Domain code that owns a track puts logic in the track's `onStart` /
 * `onUpdate` / `onEnd` / `onCancel` hooks. Use these events for
 * subsystems that watch tracks they don't own — debug overlays, replay
 * logging, telemetry, mixers that aggregate state across many tracks.
 */
export class TimelineEvents {
  private readonly _trackStartedListeners = new Set<(track: Track) => void>();
  private readonly _trackEndedListeners = new Set<(track: Track) => void>();
  private readonly _trackCanceledListeners = new Set<(track: Track) => void>();

  public onTrackStarted(cb: (track: Track) => void): Unsubscribe {
    this._trackStartedListeners.add(cb);
    return () => this._trackStartedListeners.delete(cb);
  }

  public emitTrackStarted(track: Track): void {
    for (const cb of this._trackStartedListeners) cb(track);
  }

  public onTrackEnded(cb: (track: Track) => void): Unsubscribe {
    this._trackEndedListeners.add(cb);
    return () => this._trackEndedListeners.delete(cb);
  }

  public emitTrackEnded(track: Track): void {
    for (const cb of this._trackEndedListeners) cb(track);
  }

  public onTrackCanceled(cb: (track: Track) => void): Unsubscribe {
    this._trackCanceledListeners.add(cb);
    return () => this._trackCanceledListeners.delete(cb);
  }

  public emitTrackCanceled(track: Track): void {
    for (const cb of this._trackCanceledListeners) cb(track);
  }
}
