# Gamelabsjs

`gamelabsjs` is a game framework starter-kit that will integrate:

- **Three.js** for 3D rendering
- **PixiJS** for 2D rendering

This repository currently contains the **package scaffolding + build setup**. You can define features and APIs incrementally from here.

## Install

```bash
npm i gamelabsjs three pixi.js
```

## Usage

### 2D (PixiJS)

```ts
import { Hud } from "gamelabsjs";

const hud = await Hud.create(document.body, { pixiOptions: { background: "#111111", resizeTo: window } });
```

### 3D (Three.js)

```ts
import { World } from "gamelabsjs";

const world = await World.create(undefined, { mount: document.body });

function resize() {
  world.resize(window.innerWidth, window.innerHeight, Math.min(window.devicePixelRatio || 1, 2));
}
window.addEventListener("resize", resize);
resize();

world.render();
```

## Dev

```bash
npm i
npm run build
npm run typecheck
```