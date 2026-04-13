# GameGrid Module

Grid-based game board system for turn-based and puzzle games. Provides a complete model-view-controller stack for creating, displaying, and interacting with 2D grids in a 3D world scene.

## Architecture

```
models/         Grid, GridCell, GridItem, GridPreset, GridsModel
                IGrid, IGridCell, IGridItem, IGridsModel (readonly interfaces)
events/         GridEvents
utilities/      IGridAllocator, DefaultGridAllocator
controllers/    GridsViewController
views/          GridsView, GridObject, GridCellObject, GridItemObject, GridObjectCreator
constants/      Vector3
```

### Data flow

1. Game code creates `Grid` instances and adds them to `GridsModel` via operations/utilities.
2. `GridsModel` emits events through `GridEvents`.
3. `GridsViewController` listens to events and calls `IGridView` methods.
4. `GridsView` creates/destroys Three.js objects (`GridObject`, `GridCellObject`, `GridItemObject`).

Controllers access models through readonly interfaces (`IGrid`, `IGridCell`, `IGridItem`, `IGridsModel`). Only utilities that own the data use the mutable concrete classes.

## Setup

```ts
// In your App class:
private _gridBinding = new GameGridBinding();

protected registerModules(): void {
  this.addModule(this._gridBinding);
}
```

The binding registers `GridsModel`, `GridEvents` in `diContainer`, `GridObjectCreator` in `viewDiContainer`, and the `GridsView`/`GridsViewController` pair with the view factory.

## Creating a grid

```ts
// In your GameOperations or similar utility (injected with GridsModel and GridEvents):
const grid = new Grid(gridId, columns, rows, events, preset);
model.addGrid(grid);
```

### GridPreset

Configures cell spacing and axis directions. Default is unit-sized cells on the XZ plane.

```ts
// Default: 1x1 cells, X-axis columns, Z-axis rows
const preset = new GridPreset();

// Custom: 2x2 cells
const preset = new GridPreset(2, 2);

// Custom axes (e.g. XY plane for a front-facing grid):
const preset = new GridPreset(1, 1, vector(1, 0, 0), vector(0, 1, 0));
```

| Field        | Type      | Default          | Description                            |
| ------------ | --------- | ---------------- | -------------------------------------- |
| `columnSize` | `number`  | `1`              | Width of one cell.                     |
| `rowSize`    | `number`  | `1`              | Depth of one cell.                     |
| `columnAxis` | `Vector3` | `vector(1,0,0)`  | Direction axis for column progression. |
| `rowAxis`    | `Vector3` | `vector(0,0,1)`  | Direction axis for row progression.    |

## Items

Items are placed in grid cells and represented visually by `GridItemObject` instances.

```ts
// Place an item:
grid.setCellItem(col, row, new GridItem(itemId));

// Remove an item:
grid.setCellItem(col, row, null);
```

The controller automatically syncs item changes to the view via `GridEvents.onItemChanged`.

## Custom allocators

Override how cells and items are created by implementing `IGridAllocator`:

```ts
class MyAllocator extends DefaultGridAllocator implements IGridAllocator {
  public override createItem(options: unknown): GridItem {
    const opts = options as { id: number; type: number };
    return new MyGameItem(opts.id, opts.type);
  }
}

const grid = new Grid(id, cols, rows, events, preset, new MyAllocator());
```

## Custom view objects

Override the visual representation by extending `GridCellObject`, `GridItemObject`, and `GridObjectCreator`:

```ts
class MyItemObject extends GridItemObject {
  protected override createVisual(): void {
    // Create your own Three.js meshes
  }
}

class MyObjectCreator extends GridObjectCreator {
  public override createItemObject(
    options: GridItemObjectOptions,
    pointerListener: IGridObjectListener,
    inputManager: IInputManager | null,
    assetManager?: IAssetManager | null,
  ): MyItemObject {
    return new MyItemObject(options, pointerListener, inputManager, assetManager);
  }
}

// Pass to binding:
const gridBinding = new GameGridBinding(new MyObjectCreator());
```

## Pointer events

`GridsView` implements `IGridObjectListener` with no-op stubs. Override in your custom view to handle grid interactions:

```ts
class MyGridsView extends GridsView {
  public override onGridCellPointerDown(gridId: number, col: number, row: number, event: PointerEvent): void {
    // Handle cell tap
  }
}
```

Available events: `onGridPointerDown`, `onGridPointerUp`, `onGridCellPointerDown`, `onGridCellPointerUp`, `onGridItemPointerDown`, `onGridItemPointerUp`.

## Exports

### Models
- `Grid`, `GridCell`, `GridItem`, `GridPreset`, `GridsModel`
- `IGrid`, `IGridCell`, `IGridItem`, `IGridsModel` (readonly interfaces)

### Events
- `GridEvents`

### Utilities
- `IGridAllocator`, `DefaultGridAllocator`

### Controllers
- `GridsViewController`

### Views
- `GridsView`, `GridObject`, `GridCellObject`, `GridItemObject`
- `GridCellObjectOptions`, `GridItemObjectOptions`
- `GridObjectCreator`, `IGridObjectListener`
- `IGridView`, `AddGridData`

### Types
- `Vector3`
