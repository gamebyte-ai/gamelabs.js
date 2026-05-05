import { UnsubscribeBag, UpdateManager, type IInstanceResolver, type IViewController } from "@gamebyte/gamelabsjs";
import type { IEffectsView } from "../views/IEffectsView";
import type { BubbleColor } from "../constants/BubbleColor";
import { GameEvents } from "../events/GameEvents";

/**
 * Drives the {@link IEffectsView} from the bubble-popped event and the
 * per-frame tick. One subscription, one update registration — kept
 * narrow on purpose so the controller stays under the AGENTS.md
 * decomposition-signal threshold.
 */
export class EffectsViewController implements IViewController<IEffectsView> {
  private _view: IEffectsView | null = null;
  private readonly _subs = new UnsubscribeBag();
  private _gameEvents: GameEvents | null = null;
  private _updateManager: UpdateManager | null = null;

  public inject(resolver: IInstanceResolver): void {
    this._gameEvents = resolver.getInstance(GameEvents);
    this._updateManager = resolver.getInstance(UpdateManager);
  }

  public initialize(view: IEffectsView): void {
    this._view = view;
    this._subs.add(this._gameEvents!.onBubblePopped(this._onBubblePopped));
    this._subs.add(this._updateManager!.register(this._tick, 0));
  }

  private readonly _onBubblePopped = (x: number, y: number, color: BubbleColor, points: number): void => {
    this._view?.playPopBurst(x, y, color);
    this._view?.playScorePopup(x, y, color, points);
  };

  private readonly _tick = (dt: number): void => {
    this._view?.updateParticles(dt);
    this._view?.updateScorePopups(dt);
  };

  public destroy(): void {
    this._subs.flush();
    this._view = null;
    this._gameEvents = null;
    this._updateManager = null;
  }
}
