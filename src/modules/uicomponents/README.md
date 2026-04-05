# UI Components Module

Reusable PixiJS UI components built on top of `@pixi/layout` and `@pixi/ui`. Each component accepts a plain preset object so configuration can be stored as JSON (e.g. loaded through the `AssetManager` as a `Text` asset and parsed at runtime).

## Components

- [`ButtonComponent`](#buttoncomponent) — pressable button with optional texture background and centered label
- [`BackgroundComponent`](#backgroundcomponent) — full-screen cover-fit background with overlay and fallback color
- [`ImageComponent`](#imagecomponent) — texture fitted into a layout-managed box (contain / cover / stretch)
- [`VerticalLayoutComponent`](#verticallayoutcomponent) — vertical flex container
- [`HorizontalLayoutComponent`](#horizontallayoutcomponent) — horizontal flex container

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
btn.onPress(() => { /* ... */ });
```

### `ButtonComponentPreset`

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `x` | `number` | — | X position. |
| `y` | `number` | — | Y position. |
| `width` | `number` | — | Fixed width. Ignored when the parent layout controls sizing. |
| `height` | `number` | — | Fixed height. Ignored when the parent layout controls sizing. |
| `label` | `string` | — | Label text. Omit for an icon-only button. |
| `labelStyle` | `Partial<PIXI.TextStyleOptions>` | — | Label style overrides merged on top of the defaults. |
| `radius` | `number` | `12` | Corner radius for the placeholder background. |
| `fillColor` | `number` | `0x111827` | Placeholder fill color. |
| `fillAlpha` | `number` | `0.92` | Placeholder fill alpha. |
| `strokeColor` | `number` | `0x334155` | Placeholder stroke color. |
| `strokeWidth` | `number` | `1` | Placeholder stroke width. |
| `bgTextureId` | `string` | — | Asset ID for the background texture. Resolved via `resolveAssets()`. |

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

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `bgTextureId` | `string` | — | Asset ID for the background texture. |
| `overlayColor` | `number` | `0x000000` | Overlay color drawn on top of the texture. |
| `overlayAlpha` | `number` | `0.12` | Overlay alpha when the texture is present. |
| `fallbackColor` | `number` | `0x020617` | Solid color used when no texture is loaded. |
| `fallbackAlpha` | `number` | `0.55` | Fallback alpha. |

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

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `x` | `number` | — | X position. |
| `y` | `number` | — | Y position. |
| `width` | `number \| string` | — | Fixed width. Accepts a number or a percentage string like `"100%"`. |
| `height` | `number \| string` | — | Fixed height. Accepts a number or a percentage string like `"100%"`. |
| `textureId` | `string` | — | Asset ID for the texture. Resolved via `resolveAssets()`. |
| `fit` | `"contain" \| "cover" \| "stretch"` | `"contain"` | Fit strategy. `contain` preserves aspect ratio and fits entirely inside; `cover` preserves aspect ratio and fills (may crop); `stretch` ignores aspect ratio. |
| `padding` | `number` | `1` | Scale factor applied to the fit calculation (0–1). E.g. `0.96` leaves a 4% margin. Ignored when `fit` is `"stretch"`. |

### Methods

- `setTexture(texture)` — set the texture directly.
- `resolveAssets(assetManager)` — look up `textureId` in the asset manager and apply it.

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

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `x` | `number` | — | X position. |
| `y` | `number` | — | Y position. |
| `width` | `number \| string` | — | Fixed width. Accepts a number or `"100%"`. |
| `height` | `number \| string` | — | Fixed height. Accepts a number or `"100%"`. |
| `gap` | `number` | `0` | Gap between children. |
| `padding` | `number` | `0` | Padding on all sides. |
| `alignItems` | `"flex-start" \| "center" \| "flex-end" \| "stretch"` | `"center"` | Cross-axis (horizontal) alignment. |
| `justifyContent` | `"flex-start" \| "center" \| "flex-end" \| "space-between" \| "space-around" \| "space-evenly"` | `"flex-start"` | Main-axis (vertical) distribution. |

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

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `x` | `number` | — | X position. |
| `y` | `number` | — | Y position. |
| `width` | `number \| string` | — | Fixed width. Accepts a number or `"100%"`. |
| `height` | `number \| string` | — | Fixed height. Accepts a number or `"100%"`. |
| `gap` | `number` | `0` | Gap between children. |
| `padding` | `number` | `0` | Padding on all sides. |
| `alignItems` | `"flex-start" \| "center" \| "flex-end" \| "stretch"` | `"center"` | Cross-axis (vertical) alignment. |
| `justifyContent` | `"flex-start" \| "center" \| "flex-end" \| "space-between" \| "space-around" \| "space-evenly"` | `"flex-start"` | Main-axis (horizontal) distribution. |
| `position` | `"absolute" \| "relative"` | — | Positioning mode. |
| `left` | `number` | — | Absolute offset from left (requires `position: "absolute"`). |
| `top` | `number` | — | Absolute offset from top. |
| `right` | `number` | — | Absolute offset from right. |
| `bottom` | `number` | — | Absolute offset from bottom. |

---

## JSON preset pattern

Every component can be constructed from a JSON string via its `parse*Preset` helper. This lets you store component configuration as a `Text` asset in a module's `AssetRequestList` and apply per-app overrides before `initialize()`:

```ts
// In a ModuleBinding:
this._assetRequestList.addRequest(
  new AssetRequest(
    AssetTypes.Text,
    MyAssetIds.MyButtonPreset,
    "",
    '{"width":400,"height":200,"label":"PLAY"}'
  )
);

// In a View:
const json = this.assetLoader.getAsset<string>(MyAssetIds.MyButtonPreset) ?? "{}";
const button = new ButtonComponent(parseButtonComponentPreset(json));
```

Use `UIUtils.updateFields(base, overrides)` to tweak individual fields without rewriting the full JSON:

```ts
const updated = UIUtils.updateFields(originalJson, '{"width":500}');
```
