export type TrackState = "pending" | "active" | "ended" | "canceled";

export type TrackOptions = {
  type: string;
  duration: number;
  delay?: number;
};

/**
 * Base class for objects that live on a `TimelineManager` for a bounded
 * span of time. Subclasses override the `onStart` / `onUpdate` / `onEnd`
 * / `onCancel` hooks to do work; the manager drives the lifecycle and
 * mutates `state` / `elapsed` / `startTime` / `uniqueId` through the
 * `_`-prefixed internal methods.
 *
 * Lifecycle:
 *   pending  --(currentTime >= startTime)-->  active
 *   active   --(elapsed >= duration)------->  ended
 *   *        --(manager.cancel)------------>  canceled
 *
 * `pending` and `active` are the only live states. Once `ended` or
 * `canceled` the track has been removed from the manager and its hooks
 * will not fire again.
 */
export abstract class Track {
  private _uniqueId = -1;
  private _state: TrackState = "pending";
  private _elapsed = 0;
  private _startTime = 0;
  private readonly _type: string;
  private readonly _duration: number;
  private readonly _delay: number;

  public constructor(options: TrackOptions) {
    this._type = options.type;
    this._duration = Math.max(0, options.duration);
    this._delay = Math.max(0, options.delay ?? 0);
  }

  public get uniqueId(): number {
    return this._uniqueId;
  }

  public get type(): string {
    return this._type;
  }

  public get startTime(): number {
    return this._startTime;
  }

  public get duration(): number {
    return this._duration;
  }

  public get state(): TrackState {
    return this._state;
  }

  public get elapsed(): number {
    return this._elapsed;
  }

  public get progress(): number {
    if (this._duration <= 0) return this._state === "ended" ? 1 : 0;
    const t = this._elapsed / this._duration;
    if (t < 0) return 0;
    if (t > 1) return 1;
    return t;
  }

  protected onStart(): void {}

  protected onUpdate(_elapsedSeconds: number, _dtSeconds: number): void {}

  protected onEnd(): void {}

  protected onCancel(): void {}

  /** @internal Invoked by `TimelineManager.add`. */
  public _assign(uniqueId: number, currentTime: number): void {
    this._uniqueId = uniqueId;
    this._startTime = currentTime + this._delay;
  }

  /** @internal Invoked by `TimelineManager.update` when the track first becomes active. */
  public _start(): void {
    this._state = "active";
    this._elapsed = 0;
    this.onStart();
  }

  /** @internal Invoked by `TimelineManager.update` while the track is active. Updates `elapsed` and calls `onUpdate`. */
  public _tick(currentTime: number, dtSeconds: number): void {
    this._elapsed = currentTime - this._startTime;
    this.onUpdate(this._elapsed, dtSeconds);
  }

  /** @internal Invoked by `TimelineManager.update` when the track reaches the end of its duration. */
  public _finish(): void {
    this._state = "ended";
    this.onEnd();
  }

  /** @internal Invoked by `TimelineManager.cancel`. */
  public _kill(): void {
    this._state = "canceled";
    this.onCancel();
  }
}
