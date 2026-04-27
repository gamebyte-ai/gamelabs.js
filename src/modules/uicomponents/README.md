# UI Components Module

Reusable PixiJS UI components built on top of `@pixi/layout` and `@pixi/ui`. Each component accepts a plain preset object so configuration can be stored as JSON (e.g. loaded through the `AssetManager` as a `Text` asset and parsed at runtime).

## Components

- [`ButtonComponent`](#buttoncomponent) — pressable button with optional texture background and centered label
- [`BackgroundComponent`](#backgroundcomponent) — full-screen cover-fit background with overlay and fallback color
- [`ImageComponent`](#imagecomponent) — texture fitted into a layout-managed box (contain / cover / stretch)
- [`ToggleComponent`](#togglecomponent) — on/off switch with configurable colors
- [`SliderComponent`](#slidercomponent) — horizontal slider with min/max/step constraints
- [`VerticalLayoutComponent`](#verticallayoutcomponent) — vertical flex container
- [`HorizontalLayoutComponent`](#horizontallayoutcomponent) — horizontal flex container
- [`GridLayoutComponent`](#gridlayoutcomponent) — flex container with row-wrap that approximates a CSS grid (no real grid algorithm)
- [`FullscreenLayoutComponent`](#fullscreenlayoutcomponent) — layout container whose size tracks the canvas via `AppEvents`

Each component exports a matching `parse<Name>Preset(json: string)` helper that parses a JSON string into the preset type.

---

## ButtonComponent

Pressable button with a rounded-rect placeholder background that can be replaced by a texture, plus an optional centered label. Wraps `@pixi/ui`'s `Button` internally.

```ts
const btn = new ButtonComponent({
  width: 400,
  height: 200,
  label: "PLAY",
  bgTextureId: "MainScreen.PlayButtonBg",
});
btn.resolveAssets(assetManager);
btn.onPress(() => {
  /* ... */
});
```

### `ButtonComponentPreset`

| Field         | Type                             | Default    | Description                                                          |
| ------------- | -------------------------------- | ---------- | -------------------------------------------------------------------- |
| `x`           | `number`                         | —          | X position.                                                          |
| `y`           | `number`                         | —          | Y position.                                                          |
| `width`       | `number`                         | —          | Fixed width. Ignored when the parent layout controls sizing.         |
| `height`      | `number`                         | —          | Fixed height. Ignored when the parent layout controls sizing.        |
| `label`       | `string`                         | —          | Label text. Omit for an icon-only button.                            |
| `labelStyle`  | `Partial<PIXI.TextStyleOptions>` | —          | Label style overrides merged on top of the defaults.                 |
| `radius`      | `number`                         | `12`       | Corner radius for the placeholder background.                        |
| `fillColor`   | `number`                         | `0x111827` | Placeholder fill color.                                              |
| `fillAlpha`   | `number`                         | `0.92`     | Placeholder fill alpha.                                              |
| `strokeColor` | `number`                         | `0x334155` | Placeholder stroke color.                                            |
| `strokeWidth` | `number`                         | `1`        | Placeholder stroke width.                                            |
| `bgTextureId` | `string`                         | —          | Asset ID for the background texture. Resolved via `resolveAssets()`. |

### Methods

- `setTexture(texture)` — replace the placeholder with a texture background.
- `setLabel(text)` — update the label text (no-op if the button has no label).
- `onPress(cb): Unsubscribe` — subscribe to press events.
- `resolveAssets(assetManager)` — look up `bgTextureId` in the asset manager and apply it.

---

## BackgroundComponent

Full-screen background that fills its parent (absolute layout), scales its texture to "cover" the viewport without distortion, draws an overlay on top for UI readability, and falls back to a solid color when the texture isn't loaded.

```ts
const bg = new BackgroundComponent({
  bgTextureId: "MainScreen.Background",
  overlayAlpha: 0.2,
});
bg.resolveAssets(assetManager);
```

### `BackgroundComponentPreset`

| Field           | Type     | Default    | Description                                 |
| --------------- | -------- | ---------- | ------------------------------------------- |
| `bgTextureId`   | `string` | —          | Asset ID for the background texture.        |
| `overlayColor`  | `number` | `0x000000` | Overlay color drawn on top of the texture.  |
| `overlayAlpha`  | `number` | `0.12`     | Overlay alpha when the texture is present.  |
| `fallbackColor` | `number` | `0x020617` | Solid color used when no texture is loaded. |
| `fallbackAlpha` | `number` | `0.55`     | Fallback alpha.                             |

### Methods

- `resolveAssets(assetManager)` — look up `bgTextureId` in the asset manager and apply it.

---

## ImageComponent

Texture fitted into a layout-managed box with configurable scaling behavior.

```ts
const logo = new ImageComponent({
  width: 520,
  height: 140,
  textureId: "MainScreen.Logo",
  fit: "contain",
  padding: 0.96,
});
logo.resolveAssets(assetManager);
```

### `ImageComponentPreset`

| Field       | Type                                | Default     | Description                                                                                                                                                   |
| ----------- | ----------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `x`         | `number`                            | —           | X position.                                                                                                                                                   |
| `y`         | `number`                            | —           | Y position.                                                                                                                                                   |
| `width`     | `number \| string`                  | —           | Fixed width. Accepts a number or a percentage string like `"100%"`.                                                                                           |
| `height`    | `number \| string`                  | —           | Fixed height. Accepts a number or a percentage string like `"100%"`.                                                                                          |
| `textureId` | `string`                            | —           | Asset ID for the texture. Resolved via `resolveAssets()`.                                                                                                     |
| `fit`       | `"contain" \| "cover" \| "stretch"` | `"contain"` | Fit strategy. `contain` preserves aspect ratio and fits entirely inside; `cover` preserves aspect ratio and fills (may crop); `stretch` ignores aspect ratio. |
| `padding`   | `number`                            | `1`         | Scale factor applied to the fit calculation (0–1). E.g. `0.96` leaves a 4% margin. Ignored when `fit` is `"stretch"`.                                         |

### Methods

- `setTexture(texture)` — set the texture directly.
- `resolveAssets(assetManager)` — look up `textureId` in the asset manager and apply it.

---

## ToggleComponent

On/off switch with a pill-shaped track and sliding circle thumb. Tap to toggle.

```ts
const toggle = new ToggleComponent({ value: true });
toggle.onChange((value) => {
  console.log("toggled:", value);
});
```

### `ToggleComponentPreset`

| Field        | Type      | Default    | Description                |
| ------------ | --------- | ---------- | -------------------------- |
| `width`      | `number`  | `44`       | Toggle width.              |
| `height`     | `number`  | `24`       | Toggle height.             |
| `onColor`    | `number`  | `0x48bb78` | Background color when on.  |
| `offColor`   | `number`  | `0xcbd5e0` | Background color when off. |
| `thumbColor` | `number`  | `0xffffff` | Thumb color.               |
| `thumbInset` | `number`  | `3`        | Thumb inset from edge.     |
| `value`      | `boolean` | `false`    | Initial value.             |

### Methods

- `value` — current boolean value (getter).
- `setValue(value)` — set the value programmatically (does not fire `onChange`).
- `toggle()` — flip the value and fire `onChange`.
- `onChange(cb): Unsubscribe` — subscribe to value changes.

---

## SliderComponent

Horizontal slider with a track, filled portion, and draggable thumb. Supports min/max/step value constraints. Tap on track or drag thumb to change value.

```ts
const slider = new SliderComponent({
  min: 0,
  max: 100,
  step: 1,
  value: 50,
  trackWidth: 200,
});
slider.onChange((value) => {
  console.log("value:", value);
});
```

### `SliderComponentPreset`

| Field             | Type     | Default    | Description                  |
| ----------------- | -------- | ---------- | ---------------------------- |
| `trackWidth`      | `number` | `140`      | Track width.                 |
| `trackHeight`     | `number` | `6`        | Track height.                |
| `thumbRadius`     | `number` | `10`       | Thumb radius.                |
| `trackColor`      | `number` | `0xcbd5e0` | Track background color.      |
| `fillColor`       | `number` | `0x4299e1` | Filled portion color.        |
| `thumbColor`      | `number` | `0x4299e1` | Thumb outer ring color.      |
| `thumbInnerColor` | `number` | `0xffffff` | Thumb inner circle color.    |
| `thumbInset`      | `number` | `3`        | Thumb inner inset.           |
| `min`             | `number` | `0`        | Minimum value.               |
| `max`             | `number` | `1`        | Maximum value.               |
| `step`            | `number` | `0`        | Step size. 0 for continuous. |
| `value`           | `number` | `0`        | Initial value.               |

### Methods

- `value` — current numeric value (getter).
- `min`, `max`, `step` — constraint values (getters).
- `setValue(value)` — set the value programmatically (does not fire `onChange`).
- `onChange(cb): Unsubscribe` — subscribe to value changes.

---

## VerticalLayoutComponent

Thin wrapper over a `PIXI.Container` with `flexDirection: "column"` preconfigured.

```ts
const col = new VerticalLayoutComponent({
  width: 400,
  gap: 18,
  alignItems: "center",
});
col.addChild(childA);
col.addChild(childB);
```

### `VerticalLayoutComponentPreset`

| Field            | Type                                                                                            | Default        | Description                                 |
| ---------------- | ----------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------- |
| `x`              | `number`                                                                                        | —              | X position.                                 |
| `y`              | `number`                                                                                        | —              | Y position.                                 |
| `width`          | `number \| string`                                                                              | —              | Fixed width. Accepts a number or `"100%"`.  |
| `height`         | `number \| string`                                                                              | —              | Fixed height. Accepts a number or `"100%"`. |
| `gap`            | `number`                                                                                        | `0`            | Gap between children.                       |
| `padding`        | `number`                                                                                        | `0`            | Padding on all sides.                       |
| `alignItems`     | `"flex-start" \| "center" \| "flex-end" \| "stretch"`                                           | `"center"`     | Cross-axis (horizontal) alignment.          |
| `justifyContent` | `"flex-start" \| "center" \| "flex-end" \| "space-between" \| "space-around" \| "space-evenly"` | `"flex-start"` | Main-axis (vertical) distribution.          |

---

## HorizontalLayoutComponent

Thin wrapper over a `PIXI.Container` with `flexDirection: "row"` preconfigured. Also supports absolute positioning for bars and overlays.

```ts
const row = new HorizontalLayoutComponent({
  width: "100%",
  gap: 10,
  justifyContent: "space-between",
});
```

### `HorizontalLayoutComponentPreset`

| Field            | Type                                                                                            | Default        | Description                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------ |
| `x`              | `number`                                                                                        | —              | X position.                                                  |
| `y`              | `number`                                                                                        | —              | Y position.                                                  |
| `width`          | `number \| string`                                                                              | —              | Fixed width. Accepts a number or `"100%"`.                   |
| `height`         | `number \| string`                                                                              | —              | Fixed height. Accepts a number or `"100%"`.                  |
| `gap`            | `number`                                                                                        | `0`            | Gap between children.                                        |
| `padding`        | `number`                                                                                        | `0`            | Padding on all sides.                                        |
| `alignItems`     | `"flex-start" \| "center" \| "flex-end" \| "stretch"`                                           | `"center"`     | Cross-axis (vertical) alignment.                             |
| `justifyContent` | `"flex-start" \| "center" \| "flex-end" \| "space-between" \| "space-around" \| "space-evenly"` | `"flex-start"` | Main-axis (horizontal) distribution.                         |
| `position`       | `"absolute" \| "relative"`                                                                      | —              | Positioning mode.                                            |
| `left`           | `number`                                                                                        | —              | Absolute offset from left (requires `position: "absolute"`). |
| `top`            | `number`                                                                                        | —              | Absolute offset from top.                                    |
| `right`          | `number`                                                                                        | —              | Absolute offset from right.                                  |
| `bottom`         | `number`                                                                                        | —              | Absolute offset from bottom.                                 |

---

## GridLayoutComponent

**Flex-based grid approximation.** Yoga (the layout engine behind `@pixi/layout`) doesn't implement CSS Grid, so this component is a thin preset over a `flexDirection: "row"` + `flexWrap: "wrap"` flex container. Children with explicit dimensions wrap to a new row when the cumulative width exceeds the container — producing N×M-looking grids without an actual grid algorithm. There is no track sizing, row/column spans, named lines, or dense packing. Use it when you want grid-like wrapping; reach for `VerticalLayoutComponent` / `HorizontalLayoutComponent` for plain stacks.

```ts
const grid = new GridLayoutComponent({
  width: 320,
  gap: 8,
  padding: 12,
  alignItems: "center",
  justifyContent: "flex-start",
});
for (const child of items) grid.addChild(child);
```

### `GridLayoutComponentPreset`

| Field            | Type                                                                                            | Default        | Description                                                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `x`              | `number`                                                                                        | —              | X position.                                                                                                                                     |
| `y`              | `number`                                                                                        | —              | Y position.                                                                                                                                     |
| `width`          | `number \| string`                                                                              | —              | Fixed width. Accepts a number or a percentage string like `"100%"`.                                                                             |
| `height`         | `number \| string`                                                                              | —              | Fixed height. Accepts a number or `"100%"`. Usually omitted so the grid grows to fit its rows.                                                  |
| `gap`            | `number`                                                                                        | `0`            | Gap between children on both axes. Overridden per-axis by `rowGap` / `columnGap`.                                                               |
| `rowGap`         | `number`                                                                                        | —              | Vertical gap between rows. Falls back to `gap` when omitted.                                                                                    |
| `columnGap`      | `number`                                                                                        | —              | Horizontal gap between columns. Falls back to `gap` when omitted.                                                                               |
| `padding`        | `number`                                                                                        | `0`            | Padding on all sides.                                                                                                                           |
| `alignItems`     | `"flex-start" \| "center" \| "flex-end" \| "stretch"`                                           | `"center"`     | Cross-axis (vertical) alignment of items within a row. Only visible when items in the row vary in height — uniform rows have no spare room.     |
| `alignContent`   | `"flex-start" \| "center" \| "flex-end" \| "stretch" \| "space-between" \| "space-around"`      | `"flex-start"` | Distribution of whole rows along the cross axis when there's spare vertical space (i.e. when the grid has a fixed height taller than its rows). |
| `justifyContent` | `"flex-start" \| "center" \| "flex-end" \| "space-between" \| "space-around" \| "space-evenly"` | `"flex-start"` | Main-axis (horizontal) distribution within each row.                                                                                            |
| `flexWrap`       | `"wrap" \| "nowrap" \| "wrap-reverse"`                                                          | `"wrap"`       | Wrapping behaviour. Wrapping is what makes this act as a grid; `"nowrap"` forces a single row and `"wrap-reverse"` stacks rows bottom-up.       |

Use symmetric `gap` for tidy grids; fall back to `rowGap` + `columnGap` when rows and columns need different spacing.

### Notes

- Children participate in the layout via their own `.layout` (`width` / `height`). Pixi children added without a `.layout` aren't laid out by Yoga and won't take up a grid cell — useful for absolutely-positioned overlays or debug outlines.
- The grid's height is determined by Yoga _after_ a layout pass. If you need to react to it (e.g. to draw an outline that matches the rendered size), subscribe to the `"layout"` event on the grid container and read `grid.layout.computedLayout.width` / `.height`.

---

## FullscreenLayoutComponent

Layout container whose `@pixi/layout` box tracks the app's canvas
dimensions via `AppEvents.onResize`. Useful as a layout root for HUD
widgets created outside the `ViewFactory` lifecycle (debug overlays,
app-level panels, etc.). Unlike the flex containers above, this takes
no preset — it resolves its size from the app itself.

```ts
import { FullscreenLayoutComponent, IApp, AppEvents } from "@gamebyte/gamelabsjs";

// In app or a container that has diContainer access:
const app = diContainer.getInstance(IApp);
const events = diContainer.getInstance(AppEvents);
const overlay = new FullscreenLayoutComponent(app, events);
parent.addChild(overlay);
// Merge in any extra layout rules as needed:
overlay.layout = { ...overlay.layout, flexDirection: "column", gap: 12 };
```

The container unsubscribes from `AppEvents.onResize` automatically in
its `destroy()`.

---

## JSON preset pattern

Every component can be constructed from a JSON string via its `parse*Preset` helper. This lets you store component configuration as a `Text` asset in a module's `AssetRequestList` and apply per-app overrides before `initialize()`:

```ts
// In a ModuleBinding:
this._assetRequestList.addRequest(
  new AssetRequest(AssetTypes.Text, MyAssetIds.MyButtonPreset, "", '{"width":400,"height":200,"label":"PLAY"}'),
);

// In a View:
const json = this.assetLoader.getAsset<string>(MyAssetIds.MyButtonPreset) ?? "{}";
const button = new ButtonComponent(parseButtonComponentPreset(json));
```

Use `UIUtils.updateFields(base, overrides)` to tweak individual fields without rewriting the full JSON:

```ts
const updated = UIUtils.updateFields(originalJson, '{"width":500}');
```
