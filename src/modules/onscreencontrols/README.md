# OnScreenControls Module

Touch-friendly virtual controls (buttons and joysticks) rendered as a PixiJS HUD overlay. Integrates with the `InputMapper` system through `IInputDeviceListener`, so on-screen controls and keyboard can drive the same game actions. Every control supports runtime enable/disable and visibility toggles; buttons additionally support an optional icon overlay and a circular progress ring for cooldowns or charge meters.

## Quick start

### 1. Register the binding

```ts
import { OnScreenControlsBinding } from "@gamebyte/gamelabsjs";

class MyApp extends GamelabsApp {
  private readonly _onScreenControls = new OnScreenControlsBinding();

  protected override registerModules(): void {
    this.addModule(this._onScreenControls);
  }
}
```

The binding registers `OnScreenControlManager` and `OnScreenControlEvents` in the DI container, plus default asset requests for `JoystickBase`, `JoystickHandle`, `ButtonBg`, and `ButtonProgress` textures (loaded automatically by `GamelabsApp`).

### 2. Add controls

Resolve the manager from DI and call `addControl`. Controls can be added or removed at any time after DI is configured — typically during `inject()` of an input-mapper utility.

```ts
import { OnScreenControlManager, ControlType, ControlAnchor } from "@gamebyte/gamelabsjs";

const manager = resolver.getInstance(OnScreenControlManager);

manager.addControl({
  type: ControlType.Joystick,
  id: "move",
  anchor: ControlAnchor.BottomLeft,
  offsetX: 120,
  offsetY: 120,
  baseSize: 60,
  knobSize: 25,
  dynamic: false,
  threshold: 0.2,
  base: { color: 0x44cc66, alpha: 0.85 },
  knob: { color: 0x44cc66, alpha: 0.95 },
});

manager.addControl({
  type: ControlType.Button,
  id: "fire",
  anchor: ControlAnchor.BottomRight,
  offsetX: 80,
  offsetY: 80,
  size: 88,
  up: { color: 0xef4444, alpha: 0.85 },
  down: { color: 0xff7070, alpha: 0.95 },
});
```

### 3. Add the view to your screen

```ts
// In your GameScreenView.postInitialize():
this._controls = this.viewFactory.createView(OnScreenControlsView);
this.addChild(this._controls);

// In onResize:
this._controls.resize(width, height);
```

### 4. Map to InputMapper

```ts
const manager = resolver.getInstance(OnScreenControlManager);
const mapper = new InputMapper();
mapper.addDeviceListener(keyboard);
mapper.addDeviceListener(manager); // deviceId = "onscreen"

// Joystick — analog ranges <id>.x / <id>.y for full-fidelity movement
mapper.mapRangesToDirection("onscreen", "move.x", "move.y", "move");

// (Or, if you want the same digital pipeline as keyboard arrows:
//    mapper.mapKeysToDirection("onscreen", "move.up", "move.down", "move.left", "move.right", "move");
//  See "Two input pipelines" below for the tradeoff.)

// Button presses fire as a key code
mapper.mapKeyToAction("onscreen", "fire", "shoot");
```

Or react to button presses directly without `InputMapper`:

```ts
manager.addKeyHandler("fire", (isPressed) => {
  if (isPressed) gameOps.fire();
});
```

## SpriteStyle — the unified visual descriptor

Every textured slot on a control (button up / down / disabled / icon / progress, joystick base / knob) is configured by a `SpriteStyle` (exported from `@gamebyte/gamelabsjs` core, shared across all styled HUD widgets). Every field is optional; the view layer resolves omitted values from slot-aware defaults.

```ts
type SpriteStyle = {
  textureId?: string; // framework default for the slot if omitted
  color?: number; // tint multiplier (0xFFFFFF = no tint)
  alpha?: number; // 0..1
  scaleX?: number; // fraction of slot size on the x axis; 1 = fills the slot
  scaleY?: number; // fraction of slot size on the y axis; 1 = fills the slot
};
```

`scaleX` / `scaleY` are independent so non-square overrides (a stretched icon, a wide bg) don't need per-control geometry. Pass equal values for square sprites.

Slot defaults (applied when the field is `undefined`):

| Slot                | textureId                                 | color      | alpha  | scaleX | scaleY |
| ------------------- | ----------------------------------------- | ---------- | ------ | ------ | ------ |
| Button **up**       | `OnScreenControlsAssetIds.ButtonBg`       | `0x222222` | `0.5`  | `1`    | `1`    |
| Button **down**     | `OnScreenControlsAssetIds.ButtonBg`       | `0x444444` | `0.8`  | `1`    | `1`    |
| Button **disabled** | `OnScreenControlsAssetIds.ButtonBg`       | `0x4a5a4a` | `0.55` | `1`    | `1`    |
| Button **icon**     | _required_                                | `0xFFFFFF` | `1`    | `0.6`  | `0.6`  |
| Button **progress** | `OnScreenControlsAssetIds.ButtonProgress` | `0xFFFFFF` | `0.85` | `1.1`  | `1.1`  |
| Joystick **base**   | `OnScreenControlsAssetIds.JoystickBase`   | `0xFFFFFF` | `0.85` | `1`    | `1`    |
| Joystick **knob**   | `OnScreenControlsAssetIds.JoystickHandle` | `0xFFFFFF` | `0.95` | `1`    | `1`    |

The progress ring's default `scaleX/Y` is `1.1` so it sits 5% outside the bg circle. The button icon's default `scaleX/Y` is `0.6` so it sits inside the bg with margin.

## Default textures

The module ships four white-with-alpha PNGs in `assets/`, generated by `scripts/generateOnscreenControlsTextures.mjs`:

- `joystick-base.png` — soft-edged ring (joystick base / outline)
- `joystick-handle.png` — solid disk with subtle dome shading (joystick knob)
- `button-bg.png` — flat solid disk (button background)
- `button-progress.png` — thicker ring at the very edge (button progress)

The textures are pure white so the runtime tint (`SpriteStyle.color`) controls the final colour. Apps override either by:

1. **Overriding the URL** (keeps the framework asset id):
   ```ts
   binding.assetRequestList.overrideRequest(OnScreenControlsAssetIds.JoystickBase, "/my-base.png");
   ```
2. **Using a different asset id per control** (per-slot textureId on `SpriteStyle`):
   ```ts
   addControl({ ..., base: { textureId: MyAssetIds.RetroJoystickRing } });
   ```

## Buttons

### Configuration

```ts
type VirtualButtonConfig = VirtualControlConfig & {
  type: ControlType.Button;
  size: number; // outer diameter, in pixels
  up?: SpriteStyle; // resting visual
  down?: SpriteStyle; // pressed visual
  disabled?: SpriteStyle; // visual while `setControlEnabled(id, false)`
  icon?: SpriteStyle; // optional overlay (must supply textureId)
  progress?: SpriteStyle; // optional progress ring config
};
```

### Press handling

The view fires `pointerdown` / `pointerup` to the manager, which exposes presses as a key code (`<id>`). Subscribe via:

- `manager.addKeyHandler("fire", (isPressed) => …)` — easiest for one-shot abilities
- `mapper.mapKeyToAction("onscreen", "fire", "shoot")` — when you want input mapping
- `view.onButtonStateChanged((id, isDown) => …)` — raw view event (rarely needed)

### Progress ring

A circular sweep wraps around the button, sweeping clockwise from 12 o'clock. Use it for cooldowns, charge meters, or any 0..1 quantity tied to the button.

```ts
manager.showButtonProgress("slow"); // makes the ring visible
manager.setButtonProgress("slow", 0); // empty
manager.setButtonProgress("slow", 0.42); // partially filled
manager.setButtonProgress("slow", 1); // full circle
manager.hideButtonProgress("slow");
```

The visual is built lazily on first `showButtonProgress`, so buttons that never use progress pay no cost. Progress and visibility are independent — value persists across hide/show cycles.

State queries:

```ts
manager.isButtonProgressVisible("slow");
manager.getButtonProgress("slow"); // last set value (default 0)
```

The ring is drawn behind the button bg so the visible ring forms a halo around the button. Override the `progress` `SpriteStyle` to retune colour, alpha, scale, or texture per button.

## Joysticks

### Configuration

```ts
type VirtualJoystickConfig = VirtualControlConfig & {
  type: ControlType.Joystick;
  baseSize: number; // base radius in px
  knobSize: number; // knob radius in px
  dynamic: boolean; // false: fixed at anchor; true: spawns at touch point
  dynamicAreaWidth?: number; // touch area for dynamic joysticks (default: half screen)
  dynamicAreaHeight?: number;
  threshold?: number; // 0..1 normalized distance before virtual keys fire (default 0.3)
  base?: SpriteStyle; // base ring visual
  knob?: SpriteStyle; // knob disk visual
};
```

### Static vs Dynamic

- **Static** (`dynamic: false`): base and knob are always visible at the anchor. Touch the base to start dragging.
- **Dynamic** (`dynamic: true`): base and knob are hidden until the user touches anywhere in `dynamicAreaWidth × dynamicAreaHeight`. The joystick spawns at the touch point and follows finger movement; releases hide it again.

### Two input pipelines: keys vs ranges

A joystick exposes its movement on **two** parallel channels — pick whichever fits the game.

| Channel             | Codes                                             | Fidelity                         | Wire via                           |
| ------------------- | ------------------------------------------------- | -------------------------------- | ---------------------------------- |
| **Virtual keys**    | `<id>.up`, `<id>.down`, `<id>.left`, `<id>.right` | Digital — fires past `threshold` | `InputMapper.mapKeysToDirection`   |
| **Ranges (analog)** | `<id>.x`, `<id>.y`                                | Continuous, normalized −1..1     | `InputMapper.mapRangesToDirection` |

```ts
// Digital — same pipeline as keyboard arrows; quantized to the threshold
mapper.mapKeysToDirection("onscreen", "move.up", "move.down", "move.left", "move.right", "move");

// Analog — preserves knob distance, scales speed naturally
mapper.mapRangesToDirection("onscreen", "move.x", "move.y", "move");
```

Apps usually pick one channel per action. Range mapping is the right default for avatar movement; keys are the right default for menu navigation. Both work simultaneously if you wire both, but the action will fire from each channel independently and the last update wins.

When using ranges, the `threshold` config still applies to virtual keys but is irrelevant to the range pipeline — the raw normalized values flow through. Apply your own dead zone in the action callback if needed:

```ts
mapper.addDirectionAction("move", (x, y) => {
  if (Math.hypot(x, y) < 0.1) {
    x = 0;
    y = 0;
  } // dead zone
  player.moveBy(x * speed * dt, y * speed * dt);
});
```

## Enable / disable

`setControlEnabled` works for both buttons and joysticks. Disabling drops in-flight input and switches to the disabled visual; enabling restores the resting state.

```ts
manager.setControlEnabled("fire", false); // dim, ignore presses, force-release if held
manager.setControlEnabled("move", false); // dim joystick, ignore drag, reset to centre
manager.setControlEnabled("fire", true); // restore
const enabled = manager.isControlEnabled("fire");
```

What happens per control type while disabled:

| Control      | Visual                                                                               | Input                                                    | Forced release on disable                                                            |
| ------------ | ------------------------------------------------------------------------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Button**   | Bg uses the `disabled` `SpriteStyle`; cursor flips to default; icon alpha halved.    | `setButtonDown` is silently dropped.                     | If held, `setButtonUp` fires (key handler sees release).                             |
| **Joystick** | Base + knob containers dim to 50% of their configured alpha; hit target is disabled. | `setJoystickDirection` is dropped (except for `(0, 0)`). | `resetJoystick` fires `(0, 0)` — clears virtual keys + zeroes the `<id>.x/y` ranges. |

## Visibility

`setControlVisible` shows or hides the control's Pixi container without removing it. Enabled / progress / value state is preserved across hide/show cycles. Hiding a control with an in-flight press or drag force-releases it, same as disable.

```ts
manager.setControlVisible("fire", false); // hide
manager.setControlVisible("fire", true); // show again with prior state
const visible = manager.isControlVisible("fire");
```

Visibility and enabled are **independent** flags — a hidden button can be either enabled or disabled, and the latent state takes effect when the control becomes visible again.

Common uses:

- Hide the joystick + abilities during cinematics, dialogue, or menu overlays.
- Show a "boost" button only after a power-up is collected.
- Briefly hide all controls during scene transitions and restore them on landing.

For runtime _removal_ (with state forgotten), use `removeControl` instead.

## Anchors

Controls are positioned relative to one of nine screen anchors, with `offsetX` / `offsetY` moving the control inward from the anchor:

| Value                        | Position                           |
| ---------------------------- | ---------------------------------- |
| `ControlAnchor.TopLeft`      | Top-left corner                    |
| `ControlAnchor.TopCenter`    | Top edge, horizontally centered    |
| `ControlAnchor.TopRight`     | Top-right corner                   |
| `ControlAnchor.CenterLeft`   | Left edge, vertically centered     |
| `ControlAnchor.Center`       | Screen center                      |
| `ControlAnchor.CenterRight`  | Right edge, vertically centered    |
| `ControlAnchor.BottomLeft`   | Bottom-left corner                 |
| `ControlAnchor.BottomCenter` | Bottom edge, horizontally centered |
| `ControlAnchor.BottomRight`  | Bottom-right corner                |

`offsetX` and `offsetY` are always positive — they push the control _inward_ from the anchor edge.

## Architecture

```
onscreencontrols/
├── assets/                                  ── default textures (button-bg, button-progress, joystick-base, joystick-handle)
├── controllers/
│   └── OnScreenControlsViewController.ts   ── bridges manager events ↔ view
├── events/
│   └── OnScreenControlEvents.ts            ── controlAdded/Removed, button enabled/progress events
├── utilities/
│   └── OnScreenControlManager.ts           ── stores configs + state, implements IInputDeviceListener
├── views/
│   ├── IOnScreenControlsView.ts
│   └── OnScreenControlsView.pixi.ts        ── renders sprites, reports touch events
├── OnScreenControlsBinding.ts              ── module binding (DI + default asset requests)
├── OnScreenControlsAssetIds.ts             ── built-in texture ids
├── OnScreenControlTypes.ts                 ── enums, OSC config types (uses `SpriteStyle` from core)
└── index.ts
```

Data flow:

- **Manager** is the source of truth for state (controls, key states, disabled set, progress visibility + value). It emits events on every mutation.
- **Controller** subscribes to manager events and forwards them to the view (`createControl`, `setControlEnabled`, `setControlVisible`, `setButtonProgressVisible`, `setButtonProgressValue`).
- **View** owns Pixi sprites and pointer handling. Pointer events are bridged back to the manager (`setButtonDown` / `setJoystickDirection`).
- The manager implements `IInputDeviceListener` so `InputMapper` treats it identically to a keyboard.

## Manager API summary

```ts
// Lifecycle
manager.addControl(config);
manager.removeControl(id);
manager.getControl(id);
manager.getControls();

// Enabled state (works for buttons AND joysticks)
manager.setControlEnabled(id, enabled);
manager.isControlEnabled(id);

// Visibility (works for any control; preserves enabled / progress)
manager.setControlVisible(id, visible);
manager.isControlVisible(id);

// Button progress ring
manager.showButtonProgress(id);
manager.hideButtonProgress(id);
manager.setButtonProgress(id, t); // t in [0, 1]
manager.isButtonProgressVisible(id);
manager.getButtonProgress(id);

// IInputDeviceListener — keys (boolean inputs)
manager.deviceId; // "onscreen"
manager.isKeyDown(code);
manager.addKeyPressedHandler(cb);
manager.addKeyReleasedHandler(cb);
manager.addKeyHandler(code, cb);

// IInputDeviceListener — ranges (analog inputs, joystick axes)
manager.getRangeValue(code);
manager.addRangeChangedHandler(cb);
manager.addRangeHandler(code, cb);

// Internal (called by view; rarely needed by apps)
manager.setButtonDown(id);
manager.setButtonUp(id);
manager.setJoystickDirection(id, nx, ny);
manager.resetJoystick(id);
```

## Recipes

### Cooldown ring with disabled lockout

```ts
const ABILITY = "slow";
manager.addControl({
  type: ControlType.Button,
  id: ABILITY,
  anchor: ControlAnchor.BottomLeft,
  offsetX: 120,
  offsetY: 120,
  size: 88,
  up: { color: 0x44cc66, alpha: 0.85 },
  down: { color: 0x88ee88, alpha: 0.95 },
  disabled: { color: 0x4a5a4a, alpha: 0.55 },
  icon: { textureId: MyAssetIds.SlowIcon, scaleX: 0.55, scaleY: 0.55 },
});

manager.addKeyHandler(ABILITY, (isPressed) => {
  if (isPressed) ops.tryActivateSlow();
});

gameEvents.onAbilityChanged((enabled) => {
  manager.setControlEnabled(ABILITY, enabled);
  if (enabled) manager.hideButtonProgress(ABILITY);
  else manager.showButtonProgress(ABILITY);
});
gameEvents.onAbilityProgressChanged((t) => manager.setButtonProgress(ABILITY, t));
```

### Custom button texture (no tinting)

```ts
manager.addControl({
  type: ControlType.Button,
  id: "shop",
  ...,
  // White base texture replaced with a fully-painted PNG; tint to passthrough
  // and scale up to make the button slightly larger than its hit area.
  up:       { textureId: MyAssetIds.ShopIdle,    color: 0xFFFFFF, alpha: 1,   scaleX: 1.1,  scaleY: 1.1  },
  down:     { textureId: MyAssetIds.ShopPressed, color: 0xFFFFFF, alpha: 1,   scaleX: 1.05, scaleY: 1.05 },
  disabled: { textureId: MyAssetIds.ShopIdle,    color: 0x666666, alpha: 0.5, scaleX: 1.1,  scaleY: 1.1  },
});
```

### Reusing a single texture across all states

The framework renders the same underlying texture for all three button bg states by default. Just specify `color` / `alpha` per state and let `textureId` resolve to `ButtonBg`:

```ts
up:       { color: 0x3b82f6, alpha: 0.8 },
down:     { color: 0x60a5fa, alpha: 1.0 },
disabled: { color: 0x334155, alpha: 0.4 },
```

## Exports

- `OnScreenControlsBinding`
- `OnScreenControlManager`
- `OnScreenControlEvents`
- `OnScreenControlsView`, `IOnScreenControlsView`
- `OnScreenControlsViewController`
- `OnScreenControlsAssetIds`
- `OscButton`, `OscJoystick` — self-rendering widget classes (extend `StyledHudObject`)
- `OscButtonStyle`, `OscJoystickStyle`, `OscStyleIds` — slot bundles registered in `StyleManager`
- `VirtualButtonConfig`, `VirtualJoystickConfig`, `VirtualControlConfig`, `ControlConfig`
- `ControlType`, `ControlAnchor`
- `resolveAnchorPosition`

`SpriteStyle` itself is exported from the framework root (`@gamebyte/gamelabsjs`), not the OSC module — it's shared across all styled HUD widgets.
