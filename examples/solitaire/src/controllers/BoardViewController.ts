import { UnsubscribeBag, type IInstanceResolver, type IViewController } from "@gamebyte/gamelabsjs";
import type { CardClickedInfo, CardsDragReleaseInfo, IBoardView } from "../views/IBoardView";
import { IBoardModel } from "../models/IBoardModel";
import type { IPile } from "../models/IPile";
import { SlotType } from "../constants/SlotType";
import { UndoHistory } from "../models/UndoHistory";
import { UndoEvents } from "../models/UndoEvents";
import type { UndoRecord } from "../models/UndoRecord";
import { ScoreModel } from "../models/ScoreModel";
import { GameStateModel, GameState } from "../models/GameStateModel";
import { CardMoveOperations } from "../utilities/CardMoveOperations";
import { StockOperations } from "../utilities/StockOperations";
import { UndoOperations } from "../utilities/UndoOperations";
import { ScoreCalculator } from "../utilities/ScoreCalculator";
import { WinRules } from "../utilities/WinRules";
import { SolitaireConfig } from "../SolitaireConfig";

export class BoardViewController implements IViewController<IBoardView> {
  private _view: IBoardView | null = null;
  private _board: IBoardModel | null = null;
  private _config: SolitaireConfig | null = null;
  private _undoHistory: UndoHistory | null = null;
  private _undoEvents: UndoEvents | null = null;
  private _scoreModel: ScoreModel | null = null;
  private _gameState: GameStateModel | null = null;
  private readonly _subs = new UnsubscribeBag();

  public inject(resolver: IInstanceResolver): void {
    this._board = resolver.getInstance(IBoardModel);
    this._config = resolver.getInstance(SolitaireConfig);
    this._undoHistory = resolver.getInstance(UndoHistory);
    this._undoEvents = resolver.getInstance(UndoEvents);
    this._scoreModel = resolver.getInstance(ScoreModel);
    this._gameState = resolver.getInstance(GameStateModel);
  }

  public initialize(view: IBoardView): void {
    if (!this._board) throw new Error("BoardViewController: board model not injected");
    this._view = view;
    view.bindBoard(this._board);
    view.setDragEligibilityPredicate((pile, fromIndex) => {
      // Block drag pickup entirely outside the Playing phase. During
      // Dealing the view's isAnimating gate already blocks input, but
      // a TimeOver clock-out lands with no animation in flight, so
      // this gate is the only thing standing between the player and
      // a card pickup after the lose state.
      if (!this.isGamePlaying()) return false;
      return pile.canDragFrom(fromIndex);
    });
    this._subs.add(view.onCardsDragReleased((info) => this.onCardsDragReleased(info)));
    this._subs.add(view.onCardClicked((info) => this.onCardClicked(info)));
    this._subs.add(view.onPileTapped((pile) => this.onPileTapped(pile)));
    if (this._undoEvents) {
      this._subs.add(this._undoEvents.onRequested(() => this.onUndoRequested()));
    }
    view.refresh();
  }

  public destroy(): void {
    this._subs.flush();
    this._view?.setDragEligibilityPredicate(null);
    this._view = null;
    this._board = null;
    this._config = null;
    this._undoHistory = null;
    this._undoEvents = null;
    this._scoreModel = null;
    this._gameState = null;
  }

  private onCardsDragReleased(info: CardsDragReleaseInfo): void {
    if (!this._view) return;
    if (!this.isGamePlaying()) return;
    const target = info.targetPile;
    if (target === null || target === info.originPile) {
      this._view.commitDragRelease(null);
      return;
    }
    const moving = info.originPile.cards.slice(info.fromIndex);
    if (!target.canPlace(moving)) {
      this._view.commitDragRelease(null);
      return;
    }

    const count = info.originPile.cards.length - info.fromIndex;
    CardMoveOperations.moveCards(info.originPile, info.fromIndex, target);
    const autoFlippedCardId = this.maybeAutoFlipNewTop(info.originPile);
    const scoreDelta = this.scoreForMove(info.originPile, target, autoFlippedCardId);
    this._scoreModel?.add(scoreDelta);
    this._undoHistory?.push({
      kind: "move",
      origin: info.originPile,
      target,
      count,
      autoFlippedCardId,
      scoreDelta,
    });
    this.maybeTransitionToWin();
    this._view.commitDragRelease(autoFlippedCardId);
  }

  private onCardClicked(info: CardClickedInfo): void {
    if (!this._view || !this._board) return;
    if (!this.isGamePlaying()) return;
    // Quick placement targets foundations only, which accept single
    // cards. Multi-card runs from the middle of a tableau column
    // cannot be auto-routed, so only the topmost card of any pile
    // is eligible.
    if (info.fromIndex !== info.pile.cards.length - 1) return;
    // Foundations are the end state for quick placement: a card
    // already on a foundation cannot be quick-placed again, even
    // onto another empty foundation. Without this guard, an Ace
    // sitting on its foundation would slide over to the next empty
    // foundation on click.
    if (info.pile.type === SlotType.Foundation) return;
    const card = info.pile.cards[info.fromIndex];
    let destination: IPile | null = null;
    for (const foundation of this._board.foundations) {
      if (foundation.canPlace([card])) {
        destination = foundation;
        break;
      }
    }
    if (destination === null) {
      // Eligible click (top of its pile) but no foundation accepts —
      // give the player a visual "denied" cue. No model mutation.
      this._view.animateDeniedShake(card.id);
      return;
    }
    CardMoveOperations.moveCards(info.pile, info.fromIndex, destination);
    const autoFlippedCardId = this.maybeAutoFlipNewTop(info.pile);
    const scoreDelta = this.scoreForMove(info.pile, destination, autoFlippedCardId);
    this._scoreModel?.add(scoreDelta);
    this._undoHistory?.push({
      kind: "move",
      origin: info.pile,
      target: destination,
      count: 1,
      autoFlippedCardId,
      scoreDelta,
    });
    this.maybeTransitionToWin();
    this._view.animateQuickPlacement(card.id, autoFlippedCardId);
  }

  /**
   * If the pile's new top (after a move out) needs to flip face-up,
   * record its id and mutate its face state. Returns the flipped
   * card's id, or null if nothing needed flipping. The view animates
   * the flip visually using the recorded id.
   */
  private maybeAutoFlipNewTop(pile: IPile): number | null {
    if (!pile.needsAutoFlipNewTop()) return null;
    const top = pile.topCard;
    if (top === null) return null;
    const cardId = top.id;
    CardMoveOperations.flipTopCard(pile, true);
    return cardId;
  }

  /**
   * Sums the per-event score values for a single move: the move
   * itself (looked up by origin/target pile types) plus the auto-flip
   * reveal award when the move uncovered a face-down tableau card.
   * The result is what the score model is incremented by, and what
   * the undo record stores so an undo can revert exactly the awarded
   * delta before the flat undo penalty is applied.
   */
  private isGamePlaying(): boolean {
    return this._gameState?.state === GameState.Playing;
  }

  private scoreForMove(origin: IPile, target: IPile, autoFlippedCardId: number | null): number {
    if (!this._config) return 0;
    let delta = ScoreCalculator.forMove(origin, target, this._config.score);
    if (autoFlippedCardId !== null) {
      delta += ScoreCalculator.forAutoFlipReveal(this._config.score);
    }
    return delta;
  }

  private onPileTapped(pile: IPile): void {
    if (!this._view || !this._board || !this._config) return;
    if (!this.isGamePlaying()) return;
    if (pile !== this._board.stock) return;
    if (this._board.stock.cards.length > 0) {
      const drawCount = Math.min(this._board.stock.cards.length, this._config.drawCount);
      StockOperations.drawToWaste(this._board.stock, this._board.waste, this._config.drawCount);
      const scoreDelta = ScoreCalculator.forStockDraw(this._config.score);
      this._scoreModel?.add(scoreDelta);
      this._undoHistory?.push({ kind: "draw", count: drawCount, scoreDelta });
    } else {
      const recycleCount = this._board.waste.cards.length;
      StockOperations.recycleWasteToStock(this._board.stock, this._board.waste);
      const scoreDelta = ScoreCalculator.forStockRecycle(this._config.score);
      this._scoreModel?.add(scoreDelta);
      this._undoHistory?.push({ kind: "recycle", count: recycleCount, scoreDelta });
    }
    this._view.refresh();
  }

  private onUndoRequested(): void {
    if (!this._view || !this._board || !this._undoHistory || !this._config) return;
    if (!this.isGamePlaying()) return;
    // Skip while any animation is in flight — undo mutates the model
    // and refreshes the view, which would visibly interrupt the
    // running animation. The user can click again once it settles.
    if (this._view.isAnimating()) return;
    const record: UndoRecord | null = this._undoHistory.pop();
    if (record === null) return;
    UndoOperations.undo(this._board, record);
    // Score adjustment on undo: revert the original action's awarded
    // delta to return the player to their pre-action score, then
    // apply the flat undo penalty on top. The penalty is signed —
    // a configured value of -2 reduces the score by 2 per undo.
    this._scoreModel?.add(-record.scoreDelta);
    this._scoreModel?.add(ScoreCalculator.forUndoPenalty(this._config.score));
    // Edge case: undoing a foundation→tableau move puts a card back
    // on its foundation and could land on a completed-foundations
    // configuration. Symmetric undoing of the winning move can't
    // happen because input (including undo) is blocked once Won, but
    // the check is cheap so run it here for completeness.
    this.maybeTransitionToWin();
    if (record.kind === "move") {
      this._view.playUndoMove(record.origin, record.count, record.autoFlippedCardId);
    } else {
      // Stock draws and recycles have no forward animation, so undo
      // is also instant — just rebuild from the rolled-back model.
      this._view.refresh();
    }
  }

  /**
   * Promote the game state from Playing to Won the moment all four
   * foundations are complete. Called after every model mutation that
   * could grow a foundation (moves and undos); no-op otherwise. The
   * Playing-only guard prevents re-transitioning if already terminal.
   */
  private maybeTransitionToWin(): void {
    if (!this._board || !this._gameState) return;
    if (this._gameState.state !== GameState.Playing) return;
    if (WinRules.isWon(this._board)) {
      this._gameState.setState(GameState.Won);
    }
  }
}
