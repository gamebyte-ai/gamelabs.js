import { describe, it, expect, vi } from "vitest";
import { TimelineEvents } from "../src/modules/timeline/src/events/TimelineEvents.js";
import { TimelineModel } from "../src/modules/timeline/src/models/TimelineModel.js";
import { Track, type TrackOptions } from "../src/modules/timeline/src/models/Track.js";
import { TimelineManager } from "../src/modules/timeline/src/utilities/TimelineManager.js";

class HookSpy extends Track {
  public readonly start = vi.fn();
  public readonly tick = vi.fn();
  public readonly end = vi.fn();
  public readonly cancel = vi.fn();

  public constructor(options: TrackOptions) {
    super(options);
  }

  protected override onStart(): void {
    this.start();
  }

  protected override onUpdate(elapsedSeconds: number, dtSeconds: number): void {
    this.tick(elapsedSeconds, dtSeconds);
  }

  protected override onEnd(): void {
    this.end();
  }

  protected override onCancel(): void {
    this.cancel();
  }
}

function makeManager(): { timeline: TimelineManager; model: TimelineModel; events: TimelineEvents } {
  const model = new TimelineModel();
  const events = new TimelineEvents();
  const timeline = new TimelineManager(model, events);
  return { timeline, model, events };
}

describe("TimelineManager", () => {
  describe("add", () => {
    it("assigns monotonically increasing uniqueIds starting at 1", () => {
      const { timeline } = makeManager();
      const a = timeline.add(new HookSpy({ type: "x", duration: 1 }));
      const b = timeline.add(new HookSpy({ type: "x", duration: 1 }));
      const c = timeline.add(new HookSpy({ type: "x", duration: 1 }));
      expect(a.uniqueId).toBe(1);
      expect(b.uniqueId).toBe(2);
      expect(c.uniqueId).toBe(3);
    });

    it("stamps startTime to currentTime when delay is 0 (or omitted)", () => {
      const { timeline } = makeManager();
      timeline.update(0.5);
      const t = timeline.add(new HookSpy({ type: "x", duration: 1 }));
      expect(t.startTime).toBe(0.5);
      expect(t.state).toBe("pending");
    });

    it("applies delay relative to currentTime", () => {
      const { timeline } = makeManager();
      timeline.update(0.5);
      const t = timeline.add(new HookSpy({ type: "x", duration: 1, delay: 1 }));
      expect(t.startTime).toBe(1.5);
    });

    it("clamps negative delay and duration to 0", () => {
      const { timeline } = makeManager();
      const t = timeline.add(new HookSpy({ type: "x", duration: -2, delay: -3 }));
      expect(t.duration).toBe(0);
      expect(t.startTime).toBe(0);
    });
  });

  describe("update lifecycle", () => {
    it("fires onStart, onUpdate, onEnd in order across ticks", () => {
      const { timeline } = makeManager();
      const t = timeline.add(new HookSpy({ type: "x", duration: 0.1 }));

      timeline.update(0.05);
      expect(t.start).toHaveBeenCalledTimes(1);
      expect(t.tick).toHaveBeenCalledTimes(1);
      expect(t.tick).toHaveBeenLastCalledWith(0.05, 0.05);
      expect(t.end).not.toHaveBeenCalled();
      expect(t.state).toBe("active");

      timeline.update(0.05);
      expect(t.tick).toHaveBeenCalledTimes(2);
      expect(t.tick).toHaveBeenLastCalledWith(0.1, 0.05);
      expect(t.end).toHaveBeenCalledTimes(1);
      expect(t.state).toBe("ended");
    });

    it("removes ended tracks from getTrack", () => {
      const { timeline, model } = makeManager();
      const t = timeline.add(new HookSpy({ type: "x", duration: 0.1 }));
      timeline.update(0.2);
      expect(t.state).toBe("ended");
      expect(model.getTrack(t.uniqueId)).toBeNull();
    });

    it("a zero-duration track fires onStart and onEnd in the same tick, no onUpdate", () => {
      const { timeline, model } = makeManager();
      const t = timeline.add(new HookSpy({ type: "x", duration: 0 }));
      timeline.update(0.1);
      expect(t.start).toHaveBeenCalledTimes(1);
      expect(t.tick).not.toHaveBeenCalled();
      expect(t.end).toHaveBeenCalledTimes(1);
      expect(t.state).toBe("ended");
      expect(model.getTrack(t.uniqueId)).toBeNull();
    });

    it("a delayed track stays pending until currentTime catches up", () => {
      const { timeline } = makeManager();
      const t = timeline.add(new HookSpy({ type: "x", duration: 1, delay: 1 }));

      timeline.update(0.5);
      expect(t.state).toBe("pending");
      expect(t.start).not.toHaveBeenCalled();

      timeline.update(0.6);
      expect(t.state).toBe("active");
      expect(t.start).toHaveBeenCalledTimes(1);
    });

    it("update(0) does not advance time but still promotes pending tracks whose startTime is met", () => {
      const { timeline, model } = makeManager();
      const t = timeline.add(new HookSpy({ type: "x", duration: 1 }));
      const before = model.currentTime;
      timeline.update(0);
      expect(model.currentTime).toBe(before);
      expect(t.state).toBe("active");
      expect(t.start).toHaveBeenCalledTimes(1);
    });

    it("tracks added during a hook are deferred to the next tick", () => {
      const { timeline } = makeManager();
      const second = new HookSpy({ type: "y", duration: 1 });
      let added = false;
      class Adder extends HookSpy {
        protected override onStart(): void {
          super.onStart();
          if (!added) {
            timeline.add(second);
            added = true;
          }
        }
      }
      const first = timeline.add(new Adder({ type: "x", duration: 1 }));

      timeline.update(0.1);
      expect(first.start).toHaveBeenCalledTimes(1);
      expect(second.start).not.toHaveBeenCalled();
      expect(second.state).toBe("pending");

      timeline.update(0.1);
      expect(second.start).toHaveBeenCalledTimes(1);
    });

    it("canceling another track from inside a hook is safe", () => {
      const { timeline, model } = makeManager();
      const target = timeline.add(new HookSpy({ type: "y", duration: 1 }));
      class Killer extends HookSpy {
        protected override onUpdate(): void {
          timeline.cancel(target.uniqueId);
        }
      }
      timeline.add(new Killer({ type: "x", duration: 1 }));

      timeline.update(0.1);
      expect(target.cancel).toHaveBeenCalledTimes(1);
      expect(target.state).toBe("canceled");
      expect(model.getTrack(target.uniqueId)).toBeNull();
    });
  });

  describe("cancel", () => {
    it("cancels an active track and fires onCancel (not onEnd)", () => {
      const { timeline, model } = makeManager();
      const t = timeline.add(new HookSpy({ type: "x", duration: 1 }));
      timeline.update(0.1);
      expect(t.state).toBe("active");

      const ok = timeline.cancel(t.uniqueId);
      expect(ok).toBe(true);
      expect(t.cancel).toHaveBeenCalledTimes(1);
      expect(t.end).not.toHaveBeenCalled();
      expect(t.state).toBe("canceled");
      expect(model.getTrack(t.uniqueId)).toBeNull();
    });

    it("cancels a pending track without firing onStart", () => {
      const { timeline } = makeManager();
      const t = timeline.add(new HookSpy({ type: "x", duration: 1, delay: 1 }));
      const ok = timeline.cancel(t.uniqueId);
      expect(ok).toBe(true);
      expect(t.start).not.toHaveBeenCalled();
      expect(t.cancel).toHaveBeenCalledTimes(1);
      expect(t.state).toBe("canceled");
    });

    it("returns false for an unknown id", () => {
      const { timeline } = makeManager();
      expect(timeline.cancel(9999)).toBe(false);
    });

    it("canceling an already-canceled track is a no-op", () => {
      const { timeline } = makeManager();
      const t = timeline.add(new HookSpy({ type: "x", duration: 1 }));
      timeline.cancel(t.uniqueId);
      expect(timeline.cancel(t.uniqueId)).toBe(false);
      expect(t.cancel).toHaveBeenCalledTimes(1);
    });

    it("cancelByType cancels all matching tracks and returns the count", () => {
      const { timeline } = makeManager();
      const a = timeline.add(new HookSpy({ type: "shake", duration: 1 }));
      const b = timeline.add(new HookSpy({ type: "shake", duration: 1 }));
      const c = timeline.add(new HookSpy({ type: "fade", duration: 1 }));

      const count = timeline.cancelByType("shake");
      expect(count).toBe(2);
      expect(a.state).toBe("canceled");
      expect(b.state).toBe("canceled");
      expect(c.state).toBe("pending");
    });

    it("cancelAll cancels every track", () => {
      const { timeline, model } = makeManager();
      const a = timeline.add(new HookSpy({ type: "x", duration: 1 }));
      const b = timeline.add(new HookSpy({ type: "y", duration: 1 }));

      timeline.cancelAll();
      expect(a.state).toBe("canceled");
      expect(b.state).toBe("canceled");
      expect(model.getAllTracks()).toEqual([]);
    });
  });

  describe("queries", () => {
    it("getTracksByType returns only matching tracks", () => {
      const { timeline, model } = makeManager();
      const a = timeline.add(new HookSpy({ type: "shake", duration: 1 }));
      timeline.add(new HookSpy({ type: "fade", duration: 1 }));
      const c = timeline.add(new HookSpy({ type: "shake", duration: 1 }));

      const shakes = model.getTracksByType("shake");
      expect(shakes).toHaveLength(2);
      expect(shakes).toContain(a);
      expect(shakes).toContain(c);
    });

    it("progress reports 0 while pending, [0,1] while active, 1 once ended", () => {
      const { timeline } = makeManager();
      const t = timeline.add(new HookSpy({ type: "x", duration: 1, delay: 1 }));
      expect(t.progress).toBe(0);

      timeline.update(1.5);
      expect(t.state).toBe("active");
      expect(t.progress).toBeCloseTo(0.5, 5);

      timeline.update(1);
      expect(t.state).toBe("ended");
      expect(t.progress).toBe(1);
    });
  });
});

describe("TimelineEvents", () => {
  it("fires trackStarted / trackEnded across the lifecycle", () => {
    const { timeline, events } = makeManager();
    const started = vi.fn();
    const ended = vi.fn();
    events.onTrackStarted(started);
    events.onTrackEnded(ended);

    const t = timeline.add(new HookSpy({ type: "x", duration: 0.1 }));
    timeline.update(0.05);
    expect(started).toHaveBeenCalledWith(t);
    expect(ended).not.toHaveBeenCalled();

    timeline.update(0.1);
    expect(ended).toHaveBeenCalledWith(t);
  });

  it("fires trackCanceled on cancel", () => {
    const { timeline, events } = makeManager();
    const canceled = vi.fn();
    events.onTrackCanceled(canceled);

    const t = timeline.add(new HookSpy({ type: "x", duration: 1 }));
    timeline.cancel(t.uniqueId);
    expect(canceled).toHaveBeenCalledWith(t);
  });

  it("Unsubscribe removes the listener", () => {
    const { timeline, events } = makeManager();
    const started = vi.fn();
    const unsub = events.onTrackStarted(started);
    unsub();

    timeline.add(new HookSpy({ type: "x", duration: 1 }));
    timeline.update(0.1);
    expect(started).not.toHaveBeenCalled();
  });
});
