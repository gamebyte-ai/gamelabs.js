# Timeline Module

Time-bounded lifecycle plumbing for game effects. A `TimelineManager` owns a clock and a set of `Track` instances; each track has a `startTime` + `duration` and emits `onStart` / `onUpdate` / `onEnd` / `onCancel` hooks at the right moments. Multiple tracks run concurrently, and any track can be queried or canceled by id or type at any time.

## Purpose

- Replace ad-hoc per-effect timers (camera shake, hit-stop, screen flash, boss windup, scripted cutscene beats) with a single coordinator that handles state transitions, cancellation, and removal.
- Make every active effect inspectable — debug overlays and game logic can read `ITimelineModel` to see what's running without subclassing the manager.
- Allow concurrent effects of the same type to overlap (e.g. two camera shakes from rapid hits) instead of forcing single-slot "biggest wins" workarounds.

## Usage

### Setup

The binding registers `TimelineModel` (also under `ITimelineModel`), `TimelineEvents`, and `TimelineManager` in the DI container. The app drives the timeline from its own `onStep` — the binding does not auto-register with `UpdateManager` so the app keeps control of update ordering.

```ts
import { GamelabsApp, TimelineBinding, TimelineManager } from "@gamebyte/gamelabsjs";

class MyApp extends GamelabsApp {
  private readonly _timelineBinding = new TimelineBinding();
  private _timelineManager: TimelineManager | null = null;

  protected override registerModules(): void {
    this.addModule(this._timelineBinding);
  }

  protected override configureDI(): void {
    this._timelineManager = this.diContainer.getInstance(TimelineManager);
  }

  protected override onStep(dtSeconds: number): void {
    super.onStep(dtSeconds);
    this._timelineManager?.update(dtSeconds);
    // Tick the timeline before any consumers that read its state for the
    // current frame (e.g. cameraManager.update — so shake offsets land
    // before the camera applies them).
  }
}
```

### Define a Track

Subclass `Track` and override the lifecycle hooks. `state`, `elapsed`, `progress`, `uniqueId`, `startTime` are read-only on the base — the manager owns them.

```ts
import { Track, type TrackOptions } from "@gamebyte/gamelabsjs";

type ScreenFlashOptions = { duration: number; color: number };

class ScreenFlashTrack extends Track {
  private readonly _color: number;

  public constructor(options: ScreenFlashOptions) {
    super({ type: "screen-flash", duration: options.duration });
    this._color = options.color;
  }

  protected override onStart(): void {
    overlay.setColor(this._color);
    overlay.setAlpha(1);
  }

  protected override onUpdate(elapsedSeconds: number): void {
    overlay.setAlpha(1 - elapsedSeconds / this.duration);
  }

  protected override onEnd(): void {
    overlay.setAlpha(0);
  }

  protected override onCancel(): void {
    overlay.setAlpha(0);
  }
}
```

### Add a track

`add` returns the same track instance (with its `uniqueId` assigned) so you can keep a reference if you want to cancel it later.

```ts
const flash = timelineManager.add(new ScreenFlashTrack({ duration: 0.25, color: 0xffffff }));
// later, while still active:
timelineManager.cancel(flash.uniqueId);
```

### Schedule with a delay

Pass `delay` (in seconds) to start later. The track sits in `pending` until `currentTime` catches up.

```ts
timelineManager.add(new BossWarningTrack({ duration: 0.5, delay: 1.0 }));
```

`delay <= 0` and `delay` omitted both mean "start on the next `update` tick".

### Cancel

```ts
timelineManager.cancel(uniqueId); // returns true if the track was found
timelineManager.cancelByType("screen-flash"); // returns count of tracks canceled
timelineManager.cancelAll();
```

Cancellation fires `onCancel` (not `onEnd`) and removes the track immediately, regardless of state. Canceling a pending track skips `onStart` entirely.

### Query the live set

Read access is on `ITimelineModel`. Resolve it from DI in any controller or utility that needs to inspect tracks without owning them.

```ts
import { ITimelineModel } from "@gamebyte/gamelabsjs";

const model = resolver.getInstance(ITimelineModel);
model.currentTime; // seconds since the timeline started
model.getTrack(uniqueId); // Track | null
model.getTracksByType("camera-shake"); // Track[]
model.getAllTracks(); // Track[]
```

### Observe lifecycle events

`TimelineEvents` is a cross-cutting bus for subsystems that watch tracks they don't own — debug overlays, replay logging, telemetry, mixers that aggregate state across many tracks.

```ts
import { TimelineEvents } from "@gamebyte/gamelabsjs";

const events = resolver.getInstance(TimelineEvents);
const unsub = events.onTrackEnded((track) => log(`${track.type} #${track.uniqueId} ended`));
// later:
unsub();
```

Domain code that owns the track usually doesn't need events — it puts logic in the track's hooks directly.

## Track lifecycle

| State      | Entry condition                            | Hooks fired before exit                                               |
| ---------- | ------------------------------------------ | --------------------------------------------------------------------- |
| `pending`  | `add(track)`                               | none (pending tracks haven't started)                                 |
| `active`   | `currentTime >= startTime`                 | `onStart`, then `onUpdate` once per `update` tick while in this state |
| `ended`    | `elapsed >= duration` (and `duration > 0`) | `onEnd` (track is removed from the model immediately after)           |
| `canceled` | `cancel` / `cancelByType` / `cancelAll`    | `onCancel` (track is removed from the model immediately after)        |

Notes:

- **Zero-duration tracks** fire `onStart` then `onEnd` in the same tick. `onUpdate` never fires for them — useful for "trigger" beats on a scripted timeline.
- **Tracks added during a hook** are deferred to the next tick. `update` iterates a snapshot, so adds and cancels triggered from within hooks are safe.
- **`cancel` from within another track's hook** is safe; the snapshot loop checks the track is still live before each step.
- **`update(0)`** doesn't advance time but still promotes pending tracks whose `startTime` has been reached.
- Lifecycle dispatch is synchronous — by the time `update(dt)` returns, every started/ended/canceled hook for that tick has run.

## Ready-made tracks

### `CameraShakeTrack` (in the `gamecamera` module)

A single shake event that decays linearly. Multiple instances stack additively through `GameCameraManager`'s offset aggregation.

```ts
import { CameraShakeTrack, GameCameraManager } from "@gamebyte/gamelabsjs";

const camera = resolver.getInstance(GameCameraManager);
timelineManager.add(new CameraShakeTrack(camera, { amplitude: 22, duration: 0.45 }));
```

See the avoidance example at `examples/avoidance/src/AvoidanceApp.ts` for full wiring.

## Update ordering

The timeline is a producer of state that other subsystems consume in the same frame. Tick it before its consumers:

```ts
protected override onStep(dt: number): void {
  super.onStep(dt);
  this._timelineManager?.update(dt); // tracks write state (e.g. camera offsets)
  this._cameraManager?.update(dt);   // camera reads accumulated state
}
```

Reversing the order means consumers see last frame's state, which is fine for some effects (single-frame lag) and wrong for others (visible lag during fast-changing shakes).

## Exports

- `TimelineBinding` — Module binding. Registers `TimelineModel` (under both `TimelineModel` and `ITimelineModel`), `TimelineEvents`, and `TimelineManager`.
- `TimelineManager` — Owns the clock and dispatches lifecycle hooks. API: `add`, `cancel`, `cancelByType`, `cancelAll`, `update`, `events`.
- `ITimelineModel` — Read-only interface + DI token. Surface: `currentTime`, `getTrack`, `getTracksByType`, `getAllTracks`.
- `TimelineModel` — Concrete model owning `_currentTime` / `_tracks` / `_nextId`. Mutation methods are public for the manager but should not be called by other code — resolve `ITimelineModel` instead.
- `Track` — Abstract base class. Public surface: `uniqueId`, `type`, `startTime`, `duration`, `state`, `elapsed`, `progress`. Override `onStart` / `onUpdate` / `onEnd` / `onCancel`.
- `TrackState` — `"pending" | "active" | "ended" | "canceled"`.
- `TrackOptions` — Constructor options: `{ type, duration, delay? }`.
- `TimelineEvents` — Lifecycle event bus: `onTrackStarted`, `onTrackEnded`, `onTrackCanceled` (each returns `Unsubscribe`).
