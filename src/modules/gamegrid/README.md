# GameGrid Module

Grid model + 3D render pipeline for board / puzzle games. Supports rectangular and hexagonal grids through one shape-agnostic core; per-cell item stacks for piles; group ids for multi-cell shapes.

## Module layout

```
src/modules/gamegrid/src/
├── GameGridBinding.ts          ── module binding
├── index.ts                    ── public barrel
├── grid/                       ── shape-agnostic core
│   ├── models/                 BaseGrid, BaseGridPreset, GridCell, GridItem, GridsModel,
│   │                           GridBounds, GridCoord, Vector3,
│   │                           IBaseGrid, IGridCell, IGridItem, IGridPreset, IGridsModel
│   ├── events/                 GridEvents
│   ├── utilities/              IGridAllocator, DefaultGridAllocator
│   ├── controllers/            GridsViewController
│   └── views/                  GridsView (Three.js), GridObject, GridCellObject,
│                               GridItemObject, GridObjectCreator,
│                               IGridView, IGridObjectListener, AddGridData
├── rectgrid/models/            RectGrid, IRectGrid, RectGridPreset, RectGridPresetOptions,
│                               RectDirection4, RectDirection8
└── hexgrid/models/             HexGrid, IHexGrid, HexGridPreset, HexGridPresetOptions,
                                HexDirection
```

`grid/` holds everything that doesn't depend on a specific shape — including the entire view + controller stack. `rectgrid/` and `hexgrid/` only contain the shape-specific model classes (`RectGrid` / `HexGrid` and their presets / direction enums). Apps render any shape by subclassing the shape-agnostic visual classes and dispatching from `GridObjectCreator` based on the preset type.

## Core concepts

### Preset = layout authority

A _preset_ (formerly a separate "geometry") owns everything about the grid's coordinate system — counts, layout config, and topology — in one class per shape. There is no separate geometry object; the preset answers all coordinate-math questions.

`IGridPreset` (interface) and `BaseGridPreset` (abstract class) define the common surface:

```ts
readonly columnCount: number;
readonly rowCount: number;
readonly directionCount: number;          // 4 or 8 for rect; 6 for hex

isValidCell(col, row): boolean;
getCellPosition(col, row): Vector3;       // local-space center
getBounds(): GridBounds;                  // axis-aligned extents
getCenterOffset(): Vector3;               // re-center the layout around origin
getNeighbor(col, row, direction): GridCoord | null;
getOppositeDirection(direction): number;  // (i + directionCount/2) % directionCount
getAllNeighbors(col, row): GridCoord[];
```

`RectGridPreset` adds `columnSize`, `rowSize`, `columnAxis`, `rowAxis`, `useDiagonals` (4-way vs 8-way topology). `HexGridPreset` adds `hexSize` (flat-top, odd-q offset; hex direction enum is `UP`, `UP_RIGHT`, `DOWN_RIGHT`, `DOWN`, `DOWN_LEFT`, `UP_LEFT`, clockwise from top).

`IBaseGrid extends IGridPreset` so any code that needs cell positions or neighbor traversal can take an `IBaseGrid` and never knows whether it's rect or hex.

### Cells hold stacks

Every `GridCell` has a `capacity` (default 1, set at construction) and holds a `readonly GridItem[]` stack, bottom → top. Capacity-1 cells behave identically to the old single-item model.

```ts
readonly capacity: number;
readonly size: number;                    // items.length
readonly items: readonly GridItem[];      // bottom → top
readonly item: GridItem | null;           // top (= items[size - 1] ?? null)
```

Mutation flows through three `BaseGrid` methods only — direct `cell` mutation is not part of the public API:

```ts
addCellItem(col, row, item): void
  // Push to top. Throws on overflow or if `item` is already attached to another cell.
  // Emits one itemAdded event.

removeCellItem(col, row): GridItem | null
  // Pop and return the top item, or null if empty. Clears the item's back-reference.
  // Emits one itemRemoved event.

setCellItem(col, row, item | null): void
  // Replace-stack semantics: pop until empty, then (if `item` is non-null) push it.
  // For capacity-1 cells this is an atomic swap (≤1 itemRemoved + ≤1 itemAdded);
  // for stacks it emits N itemRemoved + at most one itemAdded.
```

`GridItem.cell` always points to the cell that currently owns it (or `null`). Bookkeeping is automatic — apps never set the back-reference manually.

### Events

`GridEvents` is the shape-agnostic event bus:

```ts
onGridAdded((grid: BaseGrid) => void): Unsubscribe
onGridRemoved((grid: BaseGrid) => void): Unsubscribe
onItemAdded((cell: GridCell, item: GridItem) => void): Unsubscribe
onItemRemoved((cell: GridCell, item: GridItem) => void): Unsubscribe
onPositionChanged((grid: BaseGrid, position: Vector3) => void): Unsubscribe
onRotationChanged((grid: BaseGrid, rotation: Vector3) => void): Unsubscribe
```

Item events are intentionally split (push and pop are independent operations); `setCellItem` decomposes into the equivalent sequence of pushes and pops, so subscribers see one event per push or pop regardless of which mutation method was called. This is what lets apps render stacks correctly without ambiguity ("did the top item change, or did the stack grow?").

### Multi-cell shapes via groupId

For shapes that span multiple cells (Tetris pieces, sokoban blocks, ColorBlockJam shapes), the framework's invariant of "one item per cell" stands. Apps model the _shape_ as N items that share a `groupId` field — the framework sees N independent items, the app sees them as one logical block.

```ts
class BlockItem extends GridItem {
  public readonly groupId: number; // = Block.id
  public readonly colorIndex: number;

  public constructor(itemId: number, groupId: number, colorIndex: number) {
    super(itemId);
    this.groupId = groupId;
    this.colorIndex = colorIndex;
  }
}
```

The app's operations layer owns shape-level atomicity:

- **Move a shape**: detach every item from its current cell first (`removeCellItem` for each), then re-add at the new anchor (`addCellItem` for each). Removing all before adding any is what lets the new footprint overlap the old (a 1-cell slide).
- **Collision check**: skip cells whose top item has the same `groupId` as the moving shape. The dragged shape doesn't collide with itself.
- **Clear / explode a shape**: `removeCellItem` for every cell of the shape; the items are dropped (no longer referenced).

See `examples/colorblockjam/src/utilities/GameOperations.ts` for the canonical implementation: drag-time collision uses `cell.size` for occupancy, `_moveBlockToAnchor` does the coordinated detach/attach, `clearBlock` removes items at exit-animation start so vacated cells become available immediately.

### Stacks via per-cell capacity

For pile games (hexasort-style block columns, coin stacks), set `capacity > 1` via a custom allocator:

```ts
class StackAllocator extends DefaultGridAllocator implements IGridAllocator {
  public override createCell(grid, col, row, _capacity?: number): GridCell {
    return new GridCell(grid, col, row, /* capacity */ 10);
  }
}
```

For per-(col, row) capacity rules (e.g. hexasort's holding slots vs board cells), inspect the coords inside `createCell`. Pass the allocator to the grid constructor:

```ts
new HexGrid(GRID_ID, preset, gridEvents, new StackAllocator());
```

Stack visuals are an app concern: the framework places every item at cell center, so apps that want vertical block columns subclass `GridItemObject.createVisual` and read the item's stack index (or the cell's `size`) to position the mesh.

## Setup

### Option A — use the bundled binding

For apps where the framework's auto-syncing controller is enough (one item per cell, no special drag logic):

```ts
// In your App class:
private _gridBinding = new GameGridBinding();   // optional ctor: (creator?, viewClass?, controllerClass?)

protected registerModules(): void {
  this.addModule(this._gridBinding);
}
```

The binding registers `GridEvents` and `GridsModel` (with `IGridsModel` alias) in the app DI container, `GridObjectCreator` in the view DI container, and the `GridsView` / `GridsViewController` pair with the view factory. Construct the grid in your operations layer:

```ts
public inject(resolver: IInstanceResolver): void {
  this._events = resolver.getInstance(GridEvents);
  this._gridsModel = resolver.getInstance(GridsModel);
}

public buildLevel(): void {
  const preset = new RectGridPreset({ columnCount: 8, rowCount: 8, columnSize: 1, rowSize: 1 });
  const grid = new RectGrid(GRID_ID, preset, this._events);
  this._gridsModel.addGrid(grid);
  // mint and place GridItems via grid.addCellItem / setCellItem
}
```

### Option B — manage the view yourself

For apps that drive view animations explicitly (hexasort, colorblockjam): skip `GameGridBinding`, bind `GridEvents` + `GridsModel` directly, and run your own view + controller. The grid model and events still flow through the framework; only the auto-render pipeline is opted out.

```ts
// configureDI
diContainer.bindInstance(GridEvents, new GridEvents());
diContainer.bindSingleton(GridsModel, () => new GridsModel(), [IGridsModel]);
```

### Per-level grids

`GridsModel` is a `Map<gridId, BaseGrid>`. Apps with multiple levels add the level's grid in `buildLevel()` and remove it on `unloadLevel()`:

```ts
gridsModel.addGrid(grid); // on level start
gridsModel.removeGrid(GRID_ID); // on level end
```

The events bus is a singleton; the grid is per-level.

## Custom visuals

The framework's default cell visual is a placeholder cylinder (1u diameter, 0.1u tall, top flush with `y = 0`). The default item visual is a 0.5×0.5×0.5 box. Apps almost always replace both.

```ts
// 1. Subclass the visual classes; re-narrow the preset type
class GameCellObject extends GridCellObject {
  // declare (no override emit) re-narrows preset for type access without
  // clobbering the parent constructor's value
  declare public readonly preset: RectGridPreset;

  protected override createVisual(): void {
    const geom = new THREE.PlaneGeometry(this.preset.columnSize * 0.9, this.preset.rowSize * 0.9);
    // ...
  }
}

// 2. Subclass the creator to dispatch
class GameObjectCreator extends GridObjectCreator {
  public override createCellObject(opts, listener, input, assets): GridCellObject {
    return new GameCellObject(opts, listener, input, assets);
  }
}

// 3. Pass to the binding
const binding = new GameGridBinding(new GameObjectCreator());
```

For shape-aware creators (one app supports both rect and hex grids), inspect `options.preset` inside `createCellObject` / `createItemObject` and dispatch to a rect-specific or hex-specific subclass.

## Custom item options

`GridItemObjectOptions` carries the item id and the cell preset. Apps that need to attach domain data (color, team, value) extend it:

```ts
class GameItemObjectOptions extends GridItemObjectOptions {
  public readonly colorIndex: number;
  public constructor(itemId: number, gridPreset: RectGridPreset, colorIndex: number) {
    super(itemId, gridPreset);
    this.colorIndex = colorIndex;
  }
}
```

The view controller's `createItemObjectOption(item, grid)` hook is where the framework controller asks for these — override it to return your subclass with whatever data the visual needs:

```ts
class GameViewController extends GridsViewController {
  protected override createItemObjectOption(item: IGridItem, grid: IBaseGrid): GameItemObjectOptions {
    if (!(item instanceof BlockItem)) throw new Error("Expected BlockItem");
    return new GameItemObjectOptions(item.itemId, grid.preset as RectGridPreset, item.colorIndex);
  }
}
```

## Pointer events

`GridsView` implements `IGridObjectListener` with no-op stubs. `GridCellObject` and `GridItemObject` are `IPointerInputHandler`s — apps subclass them and forward to the listener:

```ts
class GameCellObject extends GridCellObject implements IPointerInputHandler {
  public onPointerDown(event: PointerEvent, onThisObject: boolean): void {
    if (onThisObject) this._pointerListener.onGridCellPointerDown(this.gridId, this.col, this.row, event);
  }
  // onPointerMove / onPointerUp / onPointerCancel
}
```

To handle taps, subclass `GridsView` and override the listener method:

```ts
class GameBoardsView extends GridsView {
  public override onGridCellPointerDown(gridId, col, row, event): void {
    // app-side handler
  }
}
```

Available listener methods: `onGridPointerDown`, `onGridPointerUp`, `onGridCellPointerDown`, `onGridCellPointerUp`, `onGridItemPointerDown`, `onGridItemPointerUp`.

## Quick reference: which pattern fits which game

| Game shape                            | Preset type    | Cell capacity | Items                                     | Driving the view                                  |
| ------------------------------------- | -------------- | ------------- | ----------------------------------------- | ------------------------------------------------- |
| match3, 2048, tictactoe, towerdefense | RectGridPreset | 1             | one `GridItem` subclass per cell          | `GameGridBinding` + framework controller          |
| hexasort (block piles)                | HexGridPreset  | N (e.g. 10)   | `BlockItem` with `colorIndex`             | App-owned view + controller; framework grid model |
| colorblockjam (multi-cell shapes)     | RectGridPreset | 1             | `BlockItem` with `groupId` + `colorIndex` | App-owned view + controller; framework grid model |

## Exports

### Shape-agnostic (`grid/`)

- Models: `BaseGrid`, `BaseGridPreset`, `GridCell`, `GridItem`, `GridsModel`
- Interfaces: `IBaseGrid`, `IGridPreset`, `IGridCell`, `IGridItem`, `IGridsModel`
- Types: `Vector3`, `GridCoord`, `GridBounds`, `AddGridData`
- Events: `GridEvents`
- Utilities: `IGridAllocator`, `DefaultGridAllocator`
- Controllers: `GridsViewController`
- Views: `GridsView`, `GridObject`, `GridCellObject`, `GridItemObject`, `GridObjectCreator`, `GridCellObjectOptions`, `GridItemObjectOptions`, `IGridView`, `IGridObjectListener`
- Binding: `GameGridBinding`

### Rect (`rectgrid/`)

- `RectGrid`, `IRectGrid`, `RectGridPreset`, `RectGridPresetOptions`, `RectDirection4`, `RectDirection8`

### Hex (`hexgrid/`)

- `HexGrid`, `IHexGrid`, `HexGridPreset`, `HexGridPresetOptions`, `HexDirection`
