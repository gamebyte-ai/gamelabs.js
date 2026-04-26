/**
 * Neighbor direction enum for hexagonal grids (flat-top, odd-q offset).
 *
 * Indices are ordered radially clockwise from the top edge so the
 * opposite-direction relation is `(i + 3) % 6`:
 * - `UP` ↔ `DOWN`,
 * - `UP_RIGHT` ↔ `DOWN_LEFT`,
 * - `DOWN_RIGHT` ↔ `UP_LEFT`.
 */
export enum HexDirection {
  UP = 0,
  UP_RIGHT = 1,
  DOWN_RIGHT = 2,
  DOWN = 3,
  DOWN_LEFT = 4,
  UP_LEFT = 5,
}
