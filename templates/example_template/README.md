# example_template

The minimum starting point for a new Gamelabs.js game: one `GameScreen` with a title and an empty world.

## What it shows

- `TemplateApp` — extends `GamelabsApp`, registers one screen, creates it in `postInitialize`.
- `GameScreenView` / `GameScreenViewController` — full-screen Pixi screen that renders the configured title.
- `TemplateConfig` — a single place for app-level values (title, screen transition).
- `TemplateUIIds` — namespaced enum of UI IDs.

The Three.js world layer is created by the framework but left empty — add cameras, views, and modules as your game needs them.

## Project structure

```
example_template
└──src
    ├──controllers
    │   └──GameScreenViewController.ts
    ├──views
    │   ├──IGameScreenView.ts
    │   └──GameScreenView.pixi.ts
    ├──TemplateApp.ts
    ├──TemplateConfig.ts
    ├──TemplateUIIds.ts
    └──main.ts
```

## Running

```bash
npm install
npm run dev
```

## Extending

- Add an asset enum (`TemplateAssetIds.ts`) when you load assets, then enqueue them in `loadAssets()`.
- Add a world view (extending `WorldViewBase`) and create it in `postInitialize()` via `this.viewFactory.createView(...)` + `this.world.addView(...)`.
- Add modules (e.g. `GameCameraBinding`) in `registerModules()`.
