# Solitaire Example

Work-in-progress Solitaire example built on Gamelabs.js. Current step: Klondike deal renders on top of the data-driven slot system.

## What's implemented

- **Slot system (variant-agnostic).** `BoardLayoutConfig` describes a slot grid as data; each `SlotConfig` carries a `SlotType` (`Stock`, `Waste`, `Foundation`, `Tableau`), a grid position, and a placeholder `SlotRules` block (`maxCards`, `stackingOffset`, `canDragFrom`, `canDropTo`). Other variants (Spider, FreeCell, ...) plug into the same renderer by producing a different `BoardLayoutConfig` — no view changes required.
- **Klondike layout.** `KlondikeLayoutOperations.create()` ships the standard arrangement: Stock at `(0, 0)`, Waste at `(1, 0)`, four Foundations at `(3–6, 0)`, seven Tableau at `(0–6, 1)`.
- **Card model.** `Card` (suit, rank, faceUp). `Slot` wraps each `SlotConfig` with an ordered card stack. `BoardModel` exposes `slots: readonly Slot[]` and is bound to `IBoardModel` for readonly controller access.
- **Deck + shuffle.** `DeckOperations.createStandardDeck()` returns 52 cards. `ShuffleOperations.shuffleInPlace(arr, rng)` is Fisher-Yates and takes an `IRng`. Strategies: `SeededRng` (mulberry32, reproducible) and `MathRandomRng`. `SolitaireConfig.shuffleSeed` (default `1`) picks the strategy at startup.
- **Klondike deal.** `KlondikeDealOperations.deal(board, rng)` deals 1..7 cards to tableau 1..7 (only the top card face-up), pushes the remaining 24 face-down into stock, asserts waste + foundations stay empty.
- **Rendering.** `BoardView.three.ts` lays slots out on the XZ plane, renders one `SlotObject` per slot (colored fill + outline + type label) and one `CardObject` per card (front with rank + suit symbol + suit-derived color, back with a diagonal-stripe pattern). Cards stack along the slot's `stackingOffset`.
- **Camera.** Top-down ortho camera. `BoardBoundsCalculator.compute(layout, slots)` produces the world-space content bbox; the app fits the camera around it on resize so the longest tableau fan stays in view.

## Project structure

```
solitaire
├──assets
└──src
    ├──constants
    │   ├──Rank.ts                       Rank + RANK_LABEL + ALL_RANKS
    │   ├──SlotType.ts                   Stock | Waste | Foundation | Tableau
    │   └──Suit.ts                       Suit + SUIT_SYMBOL
    ├──controllers
    │   ├──BoardViewController.ts
    │   └──GameScreenViewController.ts
    ├──models
    │   ├──BoardModel.ts
    │   ├──Card.ts                       Card + ICard
    │   ├──IBoardModel.ts
    │   ├──Slot.ts                       Slot + ISlot
    │   └──SlotConfig.ts                 SlotConfig, SlotRules, BoardLayoutConfig
    ├──utilities
    │   ├──BoardBoundsCalculator.ts
    │   ├──DeckOperations.ts
    │   ├──IRng.ts
    │   ├──KlondikeDealOperations.ts
    │   ├──KlondikeLayoutOperations.ts
    │   ├──MathRandomRng.ts
    │   ├──SeededRng.ts
    │   ├──ShuffleOperations.ts
    │   └──SuitRules.ts
    ├──views
    │   ├──BoardView.three.ts
    │   ├──CardObject.ts
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

1. Add a layout operations file next to `KlondikeLayoutOperations` (e.g. `FreeCellLayoutOperations.create()`) returning a `BoardLayoutConfig`.
2. Add a deal operations file next to `KlondikeDealOperations` (e.g. `FreeCellDealOperations.deal(board, rng)`).
3. Swap the calls in `SolitaireApp.postInitialize`. No view/controller changes required.

## Running

```bash
npm install
npm run dev
```
