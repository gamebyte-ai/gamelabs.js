# Solitaire Example

Work-in-progress Solitaire example built on Gamelabs.js. Current step: data-driven slot/zone layout.

## What's implemented

- Generic slot system shared by every Solitaire variant: each slot has a `SlotType` (`Stock`, `Waste`, `Foundation`, `Tableau`), a logical grid position, and a placeholder `SlotRules` block (max cards, stacking offset, drag/drop flags).
- Layout is data-driven: a `BoardLayoutConfig` defines the slot grid (column/row counts, slot size, gaps, slot list). Other variants (Spider, FreeCell, ...) plug in by producing a different config.
- Klondike layout shipped via `KlondikeLayoutFactory`:
  - `Stock` at `(0, 0)`, `Waste` at `(1, 0)`, Foundations at `(3-6, 0)`, Tableau at `(0-6, 1)`.
- World-side rendering: `BoardView` reads the layout from `IBoardModel` (via its controller) and creates one `SlotObject` per slot. Each slot is a colored, outlined rectangle on the XZ plane with a text-sprite label naming its type, so the layout is visually verifiable.
- Top-down 2D ortho camera, fit to the board on resize.
- No cards, no deal, no interactions yet.

## Project structure

```
solitaire
├──assets
└──src
    ├──constants
    │   └──SlotType.ts
    ├──controllers
    │   ├──BoardViewController.ts
    │   └──GameScreenViewController.ts
    ├──models
    │   ├──BoardModel.ts
    │   ├──IBoardModel.ts
    │   └──SlotConfig.ts
    ├──utilities
    │   └──KlondikeLayoutFactory.ts
    ├──views
    │   ├──BoardView.three.ts
    │   ├──GameScreenView.pixi.ts
    │   ├──IBoardView.ts
    │   ├──IGameScreenView.ts
    │   └──SlotObject.ts
    ├──SolitaireApp.ts
    ├──SolitaireAssetIds.ts
    ├──SolitaireConfig.ts
    ├──SolitaireUIIds.ts
    ├──main.ts
    └──style.css
```

## Adding a variant

1. Create a layout factory next to `KlondikeLayoutFactory` (e.g. `FreeCellLayoutFactory`) returning a `BoardLayoutConfig`.
2. Load it into `BoardModel` in `SolitaireApp.postInitialize()` instead of the Klondike one.
3. The `BoardView` reads the model and renders whatever slot grid the layout describes — no view-side changes needed for layout variation.

## Running

```bash
npm install
npm run dev
```
