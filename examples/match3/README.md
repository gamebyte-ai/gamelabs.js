# Match-3 Example

A match-3 puzzle game demonstrating the `GameGrid` module with gem matching, gravity, refill cascades, and animated board interactions. Uses Three.js for the 3D gem board and PixiJS for the HUD score display.

## What it shows

- Extending the `GameGrid` module with custom models, views, and controllers
- Custom `Match3GridItem` model with `gemType` property
- Match-3 game rules in a utility (`Match3GridService`): match detection, gravity, refill, swap validation
- Initial board generation with no pre-existing matches
- Animated gem interactions using GSAP: swap, invalid swap bounce, match pop (scale up + shrink), gravity drop (bounce), refill spawn
- Gem selection highlighting with wireframe shell, halo ring, and emissive glow
- Event-driven score updates via `Match3Events`
- Using `GameCameraBinding` with `Topdown2dCameraController` and orthographic projection
- HUD controller (`Match3HudController`) wired to view interface, not concrete class

## Project structure

```
match3
├──src
│   ├──controllers
│   │   ├──Match3GridsViewController.ts
│   │   └──Match3HudController.ts
│   ├──events
│   │   └──Match3Events.ts
│   ├──models
│   │   └──Match3GridItem.ts
│   ├──utilities
│   │   └──Match3GridService.ts
│   ├──views
│   │   ├──IGameScreenView.ts
│   │   ├──GameScreenView.pixi.ts
│   │   ├──Match3CellObject.ts
│   │   ├──Match3GemItemObject.ts
│   │   ├──Match3GemItemObjectOptions.ts
│   │   ├──Match3GridObjectCreator.ts
│   │   └──Match3GridsView.three.ts
│   ├──Match3App.ts
│   ├──Match3Config.ts
│   ├──Match3GameGridBinding.ts
│   └──main.ts
```

## Views and controllers

| View | Controller | Description |
|------|-----------|-------------|
| `Match3GridsView` (GridsView) | `Match3GridsViewController` | 3D gem board with selection, swap, match, gravity, and refill animations |
| `GameScreenView` (ScreenView) | `Match3HudController` | HUD displaying score and hint text |
| `Match3CellObject` | — | Individual board cell with pointer input |
| `Match3GemItemObject` | — | 3D gem sphere with selection highlight and GSAP animations |

## Events

| Event class | Signals | Flow |
|------------|---------|------|
| `Match3Events` | `onScoreChanged` | Match3GridsViewController emits after clearing matches, Match3HudController updates score display |

## Game flow

```
Player clicks gem A → selects it (highlight)
Player clicks adjacent gem B
    → Match3GridsViewController checks swap validity
        → if creates match:
            animate swap → apply swap → match cascade loop:
                find matches → animate pop → clear cells → emit score
                → apply gravity → animate drops
                → refill empty → animate spawns
                → repeat until no matches
        → if no match:
            animate invalid swap (bounce back)
Player clicks non-adjacent gem B → reselects B
Player clicks same gem → deselects
```

## Running

```bash
npm install
npm run dev
```
