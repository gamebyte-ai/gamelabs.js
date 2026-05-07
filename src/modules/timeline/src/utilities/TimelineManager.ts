import type { TimelineEvents } from "../events/TimelineEvents.js";
import type { TimelineModel } from "../models/TimelineModel.js";
import type { Track } from "../models/Track.js";

/**
 * Coordinates time-bounded `Track` instances. Mutates `TimelineModel`
 * (advances the clock, adds/removes tracks, allocates ids), dispatches
 * `onStart` / `onUpdate` / `onEnd` / `onCancel` to tracks at the right
 * moments, and emits lifecycle events on `TimelineEvents`.
 *
 * Read access to current time and the live track set lives on
 * `ITimelineModel`. Callers that only need to query (controllers, debug
 * overlays, mixers) should resolve `ITimelineModel` rather than
 * `TimelineManager`.
 *
 * Tracks added during a hook are deferred to the next `update` tick —
 * iteration runs on a snapshot of the track list, so adds and cancels
 * triggered from within hooks are safe.
 *
 * The manager is hand-ticked: the app calls `update(dt)` from `onStep`.
 * Per `ModuleBinding` rules, the binding does not auto-register with
 * `UpdateManager` — the app stays in control of update ordering (e.g.
 * tick the timeline before the camera so shake tracks can write offsets
 * before the camera applies them).
 */
export class TimelineManager {
  private readonly _model: TimelineModel;
  private readonly _events: TimelineEvents;

  public constructor(model: TimelineModel, events: TimelineEvents) {
    this._model = model;
    this._events = events;
  }

  public get events(): TimelineEvents {
    return this._events;
  }

  public add<T extends Track>(track: T): T {
    const id = this._model.nextId();
    track._assign(id, this._model.currentTime);
    this._model.addTrack(track);
    return track;
  }

  public cancel(uniqueId: number): boolean {
    const track = this._model.getTrack(uniqueId);
    if (!track) return false;
    this._model.removeTrack(uniqueId);
    track._kill();
    this._events.emitTrackCanceled(track);
    return true;
  }

  public cancelByType(type: string): number {
    let count = 0;
    for (const track of this._model.getTracksByType(type)) {
      this._model.removeTrack(track.uniqueId);
      track._kill();
      this._events.emitTrackCanceled(track);
      count++;
    }
    return count;
  }

  public cancelAll(): void {
    const snapshot = this._model.getAllTracks();
    this._model.clearTracks();
    for (const track of snapshot) {
      track._kill();
      this._events.emitTrackCanceled(track);
    }
  }

  public update(dtSeconds: number): void {
    this._model.advanceTime(dtSeconds);
    const currentTime = this._model.currentTime;
    const snapshot = this._model.getAllTracks();
    for (const track of snapshot) {
      if (!this._model.getTrack(track.uniqueId)) continue;

      if (track.state === "pending" && currentTime >= track.startTime) {
        track._start();
        this._events.emitTrackStarted(track);
      }

      if (track.state !== "active") continue;
      if (!this._model.getTrack(track.uniqueId)) continue;

      if (track.duration <= 0) {
        this._model.removeTrack(track.uniqueId);
        track._finish();
        this._events.emitTrackEnded(track);
        continue;
      }

      track._tick(currentTime, dtSeconds);
      if (track.elapsed >= track.duration) {
        this._model.removeTrack(track.uniqueId);
        track._finish();
        this._events.emitTrackEnded(track);
      }
    }
  }
}
