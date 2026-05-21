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
├── scripts/
│   └── generate-playable-assets.mjs  ← base64-encodes assets/ into a TS registry
└── src/
    ├── main.ts                 ← regular entry point
    ├── main.playable.ts        ← playable entry (overrides loadAssets)
    ├── MyGameApp.ts
    ├── MyGameConfig.ts
    ├── MyGameUIIds.ts
    ├── controllers/
    ├── views/
    └── generated/
        └── PlayableAssets.ts   ← AUTO-GENERATED, gitignored
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
npm run playable:assets   # base64-encode assets/ → src/generated/PlayableAssets.ts
npm run playable:dev      # dev server using the playable entry
npm run playable:build    # production build → dist-playable/index.playable.html
```

`playable:dev` and `playable:build` run `playable:assets` first, so you normally just run those two.

### How the asset pipeline works

The framework's `AssetManager.load(type, id, url)` accepts data URIs (`fetch`, Pixi `Assets.load`, and `THREE.TextureLoader` all support them natively). The build pipeline turns your `assets/` folder into a TS registry of those URIs:

1. `scripts/generate-playable-assets.mjs` walks `./assets/`, base64-encodes every file, and emits `src/generated/PlayableAssets.ts`:
   ```ts
   export const PlayableAssets = {
     logo: "data:image/png;base64,iVBORw0KGgo…",
     sfx_jump: "data:audio/wav;base64,UklGR…",
   } as const;
   ```
2. `src/main.playable.ts` imports that registry, subclasses `MyGameApp`, and overrides `loadAssets()` to pass data URIs into the existing `AssetManager.load(...)` calls.
3. `vite.playable.config.ts` uses `vite-plugin-singlefile` plus `inlineDynamicImports` and `assetsInlineLimit: 100MB` so Rollup inlines the JS chunk, the CSS, and any framework-default UI textures into one HTML.

### Adding assets

1. Drop the file into `assets/` (e.g. `assets/logo.png`, `assets/sfx_jump.wav`).
2. Define an asset id enum if you don't have one:
   ```ts
   // src/MyGameAssetIds.ts
   export enum MyGameAssetIds {
     Logo = "MyGame.Logo",
     SfxJump = "MyGame.SfxJump",
   }
   ```
3. Wire it up in `src/main.playable.ts`:
   ```ts
   import { AssetTypes } from "@gamebyte/gamelabsjs";
   import { MyGameApp } from "./MyGameApp";
   import { MyGameAssetIds } from "./MyGameAssetIds";
   import { PlayableAssets } from "./generated/PlayableAssets";

   class MyGamePlayableApp extends MyGameApp {
     protected override loadAssets(): void {
       this.assetManager.load(AssetTypes.HudTexture, MyGameAssetIds.Logo, PlayableAssets.logo);
       this.assetManager.load(AssetTypes.Audio, MyGameAssetIds.SfxJump, PlayableAssets.sfx_jump);
     }
   }

   const app = new MyGamePlayableApp(document.getElementById("stage")!);
   await app.initialize();
   app.mainLoop();
   ```
4. `npm run playable:build` regenerates the registry and rebuilds.

The registry keys are the filename stems with non-identifier chars replaced by `_` (so `ui-button.png` becomes `PlayableAssets.ui_button`).

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
- `src/generated/` — regenerated on every build
