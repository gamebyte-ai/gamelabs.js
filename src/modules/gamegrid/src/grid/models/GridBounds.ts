/**
 * Axis-aligned extents of a grid's cell layout in local space.
 *
 * - `width` is the extent along the column axis.
 * - `depth` is the extent along the row axis.
 *
 * Used for centering grids and sizing world-space colliders.
 */
export type GridBounds = { readonly width: number; readonly depth: number };
