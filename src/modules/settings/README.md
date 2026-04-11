# Settings Module

Typed game settings with boolean toggles and number sliders. Values are persisted in `localStorage` via `StorageService`, validated on write (clamp, step rounding), and broadcast via `SettingsEvents`. Includes a ready-to-use popup UI with toggle switches and drag sliders.

## Usage

### Setup

```ts
import { SettingsBinding, SettingsBooleanField, SettingsNumberField } from "gamelabsjs";

const settings = new SettingsBinding("MyGame"); // prefix for localStorage keys
settings.addField(new SettingsBooleanField("music", "Music", true));
settings.addField(new SettingsBooleanField("sfx", "Sound Effects", true));
settings.addField(new SettingsNumberField("volume", "Volume", 80, 0, 100, 5));
settings.addField(new SettingsNumberField("difficulty", "Difficulty", 1, 1, 10, 1));

// In registerModules:
this.addModule(settings);
```

### Open settings popup

```ts
uiEvents.createPopup(SettingsUIIds.SettingsPopup);
```

### Read values

```ts
const manager = resolver.getInstance(SettingsManager);
const musicOn = manager.getBooleanValue("music");
const volume = manager.getNumberValue("volume");
```

### React to changes

```ts
const events = resolver.getInstance(SettingsEvents);
events.onValueChanged((name) => {
  if (name === "volume") {
    const vol = manager.getNumberValue("volume");
    // adjust audio volume
  }
});
```

### Reset to defaults

```ts
manager.resetToDefaults();
```

## Field types

### SettingsBooleanField

```ts
new SettingsBooleanField(name, label, defaultValue);
```

- `name` — unique key (used for storage and events)
- `label` — display name in the popup
- `defaultValue` — initial value if nothing is persisted

### SettingsNumberField

```ts
new SettingsNumberField(name, label, defaultValue, min, max, step);
```

- `name`, `label`, `defaultValue` — same as boolean
- `min`, `max` — allowed range (values are clamped)
- `step` — granularity (`1` for integers, `0.1` for decimals, `5` for coarse steps)

## SettingsManager API

| Method                         | Description                                              |
| ------------------------------ | -------------------------------------------------------- |
| `addField(field)`              | Register a field (loads persisted value or uses default) |
| `getFields()`                  | Iterate all registered fields                            |
| `getField(name)`               | Get a field definition by name                           |
| `getBooleanValue(name)`        | Get current boolean value                                |
| `getNumberValue(name)`         | Get current number value                                 |
| `setBooleanValue(name, value)` | Set, validate, persist, emit event                       |
| `setNumberValue(name, value)`  | Clamp, step-round, persist, emit event                   |
| `resetToDefaults()`            | Reset all fields to default values                       |

## Persistence

Values are stored in `localStorage` with the prefix passed to `SettingsBinding`. For example, with prefix `"MyGame"`:

- `music` → stored as `"MyGame.music"`
- `volume` → stored as `"MyGame.volume"`

On load, if a persisted value exists and is valid for the field type, it's used. Otherwise the field's `defaultValue` is used. This handles schema changes gracefully — adding a new field uses its default, removing a field leaves the orphaned key harmless.

## Popup

`SettingsPopupView` renders:

- **Boolean fields** as toggle switches (green on / grey off)
- **Number fields** as horizontal sliders with a value label
- A **Close** button

Changes are applied and saved instantly as the user interacts. No "Apply" or "Save" button needed.

## Exports

- `SettingsBinding` — module binding
- `SettingsManager` — core settings manager
- `SettingsEvents` — change events
- `SettingsUIIds` — popup UI ID enum
- `SettingsFieldType` — field type enum
- `SettingsBooleanField`, `SettingsNumberField` — field definition classes
- `SettingsPopupView`, `SettingsPopupViewController` — popup view/controller
- `ISettingsPopupView` — view interface
