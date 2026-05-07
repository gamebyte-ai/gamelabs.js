import type { ITimelineModel } from "./ITimelineModel.js";
import type { Track } from "./Track.js";

/**
 * Holds timeline state: the current clock, the live track collection,
 * and the unique-id allocator.
 *
 * Read access is exposed through {@link ITimelineModel}. Mutation
 * methods (`advanceTime`, `nextId`, `addTrack`, `removeTrack`,
 * `clearTracks`) are public on the concrete class so `TimelineManager`
 * can drive them, but controllers and other observers should resolve
 * `ITimelineModel` and use only the read-only surface.
 */
export class TimelineModel implements ITimelineModel {
  private _currentTime = 0;
  private readonly _tracks = new Map<number, Track>();
  private _nextId = 1;

  public get currentTime(): number {
    return this._currentTime;
  }

  public getTrack(uniqueId: number): Track | null {
    return this._tracks.get(uniqueId) ?? null;
  }

  public getTracksByType(type: string): Track[] {
    const out: Track[] = [];
    for (const t of this._tracks.values()) if (t.type === type) out.push(t);
    return out;
  }

  public getAllTracks(): Track[] {
    return Array.from(this._tracks.values());
  }

  public advanceTime(dtSeconds: number): void {
    this._currentTime += dtSeconds;
  }

  public nextId(): number {
    return this._nextId++;
  }

  public addTrack(track: Track): void {
    this._tracks.set(track.uniqueId, track);
  }

  public removeTrack(uniqueId: number): boolean {
    return this._tracks.delete(uniqueId);
  }

  public clearTracks(): void {
    this._tracks.clear();
  }
}
