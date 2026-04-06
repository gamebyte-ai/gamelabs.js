import type { IGridView } from "gamelabsjs";
import type { GravityMove, RefillSpawn } from "../utilities/Match3GridService.js";

export interface IMatch3GridsView extends IGridView {
  setCellPointerDownHandler(handler: ((gridId: number, col: number, row: number) => void) | null): void;
  updateGemSelection(gridId: number, selected: { col: number; row: number } | null): void;
  animateInvalidSwap(gridId: number, r1: number, c1: number, r2: number, c2: number): Promise<void>;
  animateValidSwap(gridId: number, r1: number, c1: number, r2: number, c2: number): Promise<void>;
  animateClearMatches(gridId: number, matches: { row: number; col: number }[]): Promise<void>;
  animateGravityMoves(gridId: number, moves: GravityMove[]): Promise<void>;
  animateRefillSpawns(gridId: number, spawns: RefillSpawn[]): Promise<void>;
}
