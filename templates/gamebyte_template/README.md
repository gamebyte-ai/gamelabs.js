# Gamebyte template

Starter project for building a game with [@gamebyte/gamelabsjs](https://github.com/gamebyte-ai/gamelabs.js). Copy this folder, rename the package, and start replacing `MyGame*` with your game's name.

## Layout

```
.
├── index.html                  ← regular dev/prod entry
├── index.playable.html         ← playable-ad entry (single inlined HTML)
├── vite.config.ts              ← regular Vite config
├── vite.playable.config.ts     ← playable Vite config (inlines everything)
├── assets/                     ← drop game assets here (create on demand)
└── src/
    ├── main.ts                 ← entry point (shared by both builds)
    ├── MyGameApp.ts
    ├── MyGameConfig.ts
    ├── MyGameUIIds.ts
    ├── controllers/
    └── views/
```

## Regular development

```bash
npm install
npm run dev          # vite dev server on http://localhost:5173
npm run build        # production build → dist/
npm run preview      # preview the production build
```

## Playable-ad build

A playable ad is a single self-contained HTML file with all JS, CSS, and assets inlined as `data:` URIs. The build below produces one `index.playable.html` (no external requests) that you can upload to an ad network.

### Commands

```bash
npm run playable:dev      # dev server using the playable entry
npm run playable:build    # production build → dist-playable/index.playable.html
```

Both reuse the regular `src/main.ts` — there is no separate playable entry point to maintain.

### How it works

`vite.playable.config.ts` uses `vite-plugin-singlefile` plus `inlineDynamicImports` and `assetsInlineLimit: 100MB`, so Vite inlines the JS chunk, the CSS, and **every asset it can see** into one HTML — both your game's own assets and the framework's default UI textures. No codegen, no registry, no separate entry: the playable build is just your normal app, inlined.

"Assets it can see" means any asset you reference with a **static** `new URL(...)` literal — which is how the framework loads assets anyway, so it works automatically.

### Adding assets

Load assets the normal way, in your app's `loadAssets()`. Reference each file with `new URL("../assets/<file>", import.meta.url)` and pass it to `AssetManager.load(...)`:

```ts
// src/MyGameApp.ts
import { AssetTypes } from "@gamebyte/gamelabsjs";

protected override loadAssets(): void {
  this.assetManager.load(
    AssetTypes.HudTexture,
    MyGameAssetIds.Logo,
    new URL("../assets/logo.png", import.meta.url).href,
  );
  this.assetManager.load(
    AssetTypes.Audio,
    MyGameAssetIds.SfxJump,
    new URL("../assets/sfx_jump.wav", import.meta.url).href,
  );
}
```

In `dev`/`build` Vite serves/emits these as files; in `playable:build` it inlines them as `data:` URIs. Same code, no playable-specific branch.

> **One constraint:** the path must be a static string literal inside `new URL(..., import.meta.url)`. Vite inlines by statically analyzing that exact form — a runtime-built path (e.g. `new URL(\`../assets/${name}.png\`, import.meta.url)`) can't be seen, so it won't be inlined and the playable will 404. Enumerate variants as explicit literals instead.

### Ad-network SDK

`index.playable.html` includes a `window.playableSDK` shim so the file runs standalone in a browser for QA. For the final upload, replace that script block with the network's SDK call:

| Network              | CTA call                                  |
| -------------------- | ----------------------------------------- |
| MRAID (most networks)| `mraid.open(url)`                         |
| Meta Audience Network| `FbPlayableAd.onCTAClick()`               |
| Google AdMob         | `ExitApi.exit()`                          |
| Unity Ads            | `mraid.open(url)` (MRAID-based)           |
| AppLovin             | `mraid.open(url)` (MRAID-based)           |
| IronSource           | `mraid.open(url)` (MRAID-based)           |

Call your replacement from a "Download" / "Play now" button handler in a view.

### Size limits

Ad networks enforce single-file size caps. The framework alone (Three.js + Pixi + UI modules) is roughly 1.3 MB. Headroom for game assets:

| Network              | Cap     |
| -------------------- | ------- |
| Google AdMob         | 5 MB    |
| Unity Ads            | 5 MB    |
| AppLovin             | 5 MB    |
| IronSource           | 3 MB    |
| TikTok               | 2.4 MB  |
| Meta Audience Network| 2 MB    |

Base64 encoding adds ~33% to each asset's bytes. Tips to stay under cap:
- Audio: short mono OGG/MP3 (avoid WAV); or drop audio entirely (many playables are muted).
- Images: WebP over PNG; downscale aggressively.
- If you only render 2D, you can drop Three.js — see the framework docs for a Pixi-only setup.
- If you only render 3D, drop Pixi's HUD layer.

### What gets gitignored

- `dist-playable/` — build output
