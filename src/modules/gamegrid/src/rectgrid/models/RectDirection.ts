/**
 * Neighbor direction enum for rectangular grids in 4-way mode (cardinals only).
 *
 * Indices are ordered radially clockwise so the opposite-direction relation
 * is `(i + 2) % 4`:
 * - `RIGHT` ↔ `LEFT`, `DOWN` ↔ `UP`.
 *
 * Use this enum when constructing `RectGridGeometry` with `useDiagonals: false`.
 */
export enum RectDirection4 {
  RIGHT = 0,
  DOWN = 1,
  LEFT = 2,
  UP = 3,
}

/**
 * Neighbor direction enum for rectangular grids in 8-way mode
 * (cardinals + diagonals).
 *
 * Indices are ordered radially clockwise so the opposite-direction relation
 * is `(i + 4) % 8`:
 * - `RIGHT` ↔ `LEFT`, `RIGHT_DOWN` ↔ `LEFT_UP`, `DOWN` ↔ `UP`,
 *   `LEFT_DOWN` ↔ `RIGHT_UP`.
 *
 * Use this enum when constructing `RectGridGeometry` with `useDiagonals: true`.
 */
export enum RectDirection8 {
  RIGHT = 0,
  RIGHT_DOWN = 1,
  DOWN = 2,
  LEFT_DOWN = 3,
  LEFT = 4,
  LEFT_UP = 5,
  UP = 6,
  RIGHT_UP = 7,
}
