import { LabelComponent, ScreenView, UIComponentsStyleIds, type LabelComponentStyle } from "@gamebyte/gamelabsjs";
import type { IGameScreenView } from "./IGameScreenView";

const TITLE_LABEL_SIZE = 22;
const HUD_LABEL_SIZE = 22;
const HUD_LABEL_MARGIN = 16;
// Centered end-state overlay, larger than corner HUD labels so a
// terminal state reads clearly across the board layout.
const END_STATE_LABEL_SIZE = 56;

/**
 * HUD overlay for the game screen.
 *
 * Corner-pinned: title (top-left, replaced with score), time
 * (top-right). Centered overlay: end-state label, hidden while
 * playing, shown when the controller pushes a non-null appearance
 * (currently only triggered on game-over).
 *
 * Layout pattern lifted from Solitaire's GameScreenView — absolute-
 * positioned children resolve against the screen's own layout box,
 * which is set every resize so the corner pins actually pin.
 */
export class GameScreenView extends ScreenView implements IGameScreenView {
  private _scoreLabel: LabelComponent | null = null;
  private _timeLabel: LabelComponent | null = null;
  private _endStateLabel: LabelComponent | null = null;

  public override postInitialize(): void {
    super.postInitialize();

    this._scoreLabel = this.buildHudLabel("Score: 0", TITLE_LABEL_SIZE);
    this._scoreLabel.layout = { position: "absolute", left: HUD_LABEL_MARGIN, top: HUD_LABEL_MARGIN };
    this.addChild(this._scoreLabel);

    this._timeLabel = this.buildHudLabel("00:00", HUD_LABEL_SIZE);
    this._timeLabel.layout = { position: "absolute", right: HUD_LABEL_MARGIN, top: HUD_LABEL_MARGIN };
    this.addChild(this._timeLabel);

    this._endStateLabel = this.buildEndStateLabel();
    this._endStateLabel.visible = false;
    this.addChild(this._endStateLabel);
  }

  public override onResize(width: number, height: number, dpr: number): void {
    super.onResize(width, height, dpr);
    // Absolute-positioned children resolve against the screen's own
    // layout box, so the screen needs explicit width/height every
    // time the canvas changes size. Without this the children stack
    // at (0, 0).
    this.layout = { width: Math.max(1, width), height: Math.max(1, height) };

    if (this._endStateLabel) {
      // Anchored at (0.5, 0.5); position via raw x/y rather than
      // layout so centering doesn't depend on a flex container.
      this._endStateLabel.x = Math.max(1, width) / 2;
      this._endStateLabel.y = Math.max(1, height) / 2;
    }
  }

  public setScoreText(text: string): void {
    this._scoreLabel?.setText(text);
  }

  public setTimeText(text: string): void {
    this._timeLabel?.setText(text);
  }

  public setEndStateLabel(appearance: { readonly text: string; readonly color: number } | null): void {
    if (!this._endStateLabel) return;
    if (appearance === null) {
      this._endStateLabel.visible = false;
      return;
    }
    this._endStateLabel.setText(appearance.text);
    // Per-state colour comes through Container.tint — the resolved
    // label style keeps the base text colour at white so the tint
    // multiplies cleanly to the desired hue.
    this._endStateLabel.tint = appearance.color;
    this._endStateLabel.visible = true;
  }

  private buildHudLabel(initialText: string, fontSize: number): LabelComponent {
    const style = this.styleManager.resolve<LabelComponentStyle>(UIComponentsStyleIds.Label, {
      text: { fontSize, fontWeight: "600", color: 0xffffff },
    });
    return new LabelComponent(this.assetLoader, style, { text: initialText });
  }

  private buildEndStateLabel(): LabelComponent {
    const style = this.styleManager.resolve<LabelComponentStyle>(UIComponentsStyleIds.Label, {
      text: { fontSize: END_STATE_LABEL_SIZE, fontWeight: "700", color: 0xffffff },
    });
    return new LabelComponent(this.assetLoader, style, { text: "", anchorX: 0.5, anchorY: 0.5 });
  }
}
