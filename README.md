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
import { create2DApp } from "gamelabsjs/2d";

const app = await create2DApp({ background: "#111111", resizeTo: window });
document.body.appendChild(app.canvas);
```

### 3D (Three.js)

```ts
import { create3DRenderer } from "gamelabsjs/3d";

const renderer = create3DRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
```

## Dev

```bash
npm i
npm run build
npm run typecheck
```