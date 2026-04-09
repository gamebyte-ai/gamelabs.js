# OnScreenControls Module

Touch-friendly virtual controls (buttons and joysticks) rendered as a PixiJS HUD overlay. Integrates with the `InputMapper` system through `IInputDeviceListener`, so on-screen controls and keyboard can drive the same game actions.

## Usage

### 1. Configure controls in the app

```ts
import { OnScreenControlsBinding, ControlType, ControlAnchor } from "gamelabsjs";

const onScreenControls = new OnScreenControlsBinding();

onScreenControls.addControl({
  type: ControlType.Joystick,
  id: "move",
  anchor: ControlAnchor.BottomLeft,
  offsetX: 120,
  offsetY: 120,
  baseSize: 60,
  knobSize: 25,
  dynamic: false,
  threshold: 0.2,
});

onScreenControls.addControl({
  type: ControlType.Button,
  id: "fire",
  anchor: ControlAnchor.BottomRight,
  offsetX: 80,
  offsetY: 80,
  size: 70,
});

// Register before initialize
this.addModule(onScreenControls);
```

### 2. Create the view in your screen

```ts
// In your GameScreenView.postInitialize():
this._controls = this.viewFactory.createView(OnScreenControlsView);
this.addChild(this._controls);

// In onResize:
this._controls.resize(width, height);
```

### 3. Map to InputMapper

```ts
const mapper = new InputMapper();
mapper.addDeviceListener(keyboard);
mapper.addDeviceListener(onScreenControls.manager); // deviceId = "onscreen"

// Joystick exposes virtual keys: <id>.up, <id>.down, <id>.left, <id>.right
mapper.mapKeysToDirection("onscreen", "move.up", "move.down", "move.left", "move.right", "move");

// Button exposes its id as a key code
mapper.mapKeyToAction("onscreen", "fire", "shoot");
```

## Architecture

```
onscreencontrols/
├── controllers/
│   └── OnScreenControlsController.ts   — bridges view events to manager
├── utilities/
│   └── OnScreenControlManager.ts       — stores configs, tracks state, implements IInputDeviceListener
├── views/
│   ├── IOnScreenControlsView.ts
│   └── OnScreenControlsView.pixi.ts    — renders controls, reports touch events
├── OnScreenControlsBinding.ts          — module binding
├── OnScreenControlTypes.ts             — enums, config types, anchor math
└── index.ts
```

- **View** creates control visuals and reports touch events (`onButtonStateChanged`, `onJoystickDirectionChanged`)
- **Controller** listens to view events and calls `OnScreenControlManager.setButtonDown/Up` and `setJoystickDirection`
- **Manager** implements `IInputDeviceListener` so `InputMapper` can map on-screen controls to game actions just like keyboard keys

## Enums

### `ControlType`

| Value | Description |
| --- | --- |
| `ControlType.Button` | Virtual button |
| `ControlType.Joystick` | Virtual joystick |

### `ControlAnchor`

Positions controls relative to screen edges and center.

| Value | Position |
| --- | --- |
| `ControlAnchor.TopLeft` | Top-left corner |
| `ControlAnchor.TopCenter` | Top edge, horizontally centered |
| `ControlAnchor.TopRight` | Top-right corner |
| `ControlAnchor.CenterLeft` | Left edge, vertically centered |
| `ControlAnchor.Center` | Screen center |
| `ControlAnchor.CenterRight` | Right edge, vertically centered |
| `ControlAnchor.BottomLeft` | Bottom-left corner |
| `ControlAnchor.BottomCenter` | Bottom edge, horizontally centered |
| `ControlAnchor.BottomRight` | Bottom-right corner |

`offsetX` and `offsetY` move the control inward from the anchor point.

## Control Configs

### Base (`VirtualControlConfig`)

All controls share these fields:

| Field | Type | Description |
| --- | --- | --- |
| `type` | `ControlType` | Control type discriminator |
| `id` | `string` | Unique identifier (used as key code for buttons, prefix for joystick virtual keys) |
| `anchor` | `ControlAnchor` | Screen anchor point |
| `offsetX` | `number` | Horizontal offset from anchor (pixels inward) |
| `offsetY` | `number` | Vertical offset from anchor (pixels inward) |

### Virtual Button (`VirtualButtonConfig`)

Extends `VirtualControlConfig` with:

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `size` | `number` | — | Diameter of the button circle |
| `iconTextureId` | `string` | — | Optional asset ID for an icon texture |
| `upColor` | `number` | `0x222222` | Fill color in up state |
| `downColor` | `number` | `0x444444` | Fill color in down state |
| `upAlpha` | `number` | `0.5` | Fill alpha in up state |
| `downAlpha` | `number` | `0.8` | Fill alpha in down state |

### Virtual Joystick (`VirtualJoystickConfig`)

Extends `VirtualControlConfig` with:

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `baseSize` | `number` | — | Radius of the joystick base circle |
| `knobSize` | `number` | — | Radius of the movable knob |
| `dynamic` | `boolean` | — | If `true`, joystick appears at touch point within its area |
| `dynamicAreaWidth` | `number` | half screen width | Touch area width (only when `dynamic=true`) |
| `dynamicAreaHeight` | `number` | half screen height | Touch area height (only when `dynamic=true`) |
| `threshold` | `number` | `0.3` | Normalized distance (0–1) before a virtual key fires |
| `baseColor` | `number` | `0x222222` | Base circle color |
| `baseAlpha` | `number` | `0.35` | Base circle alpha |
| `knobColor` | `number` | `0x888888` | Knob circle color |
| `knobAlpha` | `number` | `0.6` | Knob circle alpha |

**Joystick virtual keys:** When the knob is pushed past the threshold, the manager fires virtual key press/release events using the codes `<id>.up`, `<id>.down`, `<id>.left`, `<id>.right`. These integrate with `InputMapper.mapKeysToDirection()`.

**Static vs Dynamic:**
- **Static** (`dynamic: false`): base and knob are always visible at the anchor position. Touch the base to start dragging.
- **Dynamic** (`dynamic: true`): base and knob are hidden. Touch anywhere in the touch area to spawn the joystick at your finger position, then drag.
