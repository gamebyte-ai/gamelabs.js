import { Container, Graphics } from "pixi.js";
import {
  LabelComponent,
  ScreenView,
  UIComponentsStyleIds,
  type IInstanceResolver,
  type LabelComponentStyle,
} from "@gamebyte/gamelabsjs";
import { BlockPuzzleConfig } from "../BlockPuzzleConfig";
import type { ComboHudState, IGameScreenView } from "./IGameScreenView";

const TITLE_LABEL_SIZE = 22;
const HUD_LABEL_SIZE = 22;
const HUD_LABEL_MARGIN = 16;
// Centered end-state overlay, larger than corner HUD labels so a
// terminal state reads clearly across the board layout.
const END_STATE_LABEL_SIZE = 56;

/**
 * HUD overlay for the game screen.
 *
 * Corner-pinned: score (top-left), time (top-right). Top-centre:
 * combo widget (N circles + state-driven label). Centered overlay:
 * end-state label, hidden while playing, shown when the controller
 * pushes a non-null appearance (currently only triggered on
 * game-over).
 *
 * Absolute-positioned children resolve against the screen's own
 * layout box, which is set every resize so the corner pins actually
 * pin. The combo widget and the end-state label are positioned with
 * raw `x` / `y` so centering doesn't depend on a flex container.
 */
export class GameScreenView extends ScreenView implements IGameScreenView {
  private _config: BlockPuzzleConfig | null = null;
  private _scoreLabel: LabelComponent | null = null;
  private _timeLabel: LabelComponent | null = null;
  private _endStateLabel: LabelComponent | null = null;
  private _comboContainer: Container | null = null;
  private _comboCircles: Graphics[] = [];
  private _comboLabel: LabelComponent | null = null;

  public override inject(resolver: IInstanceResolver): void {
    super.inject(resolver);
    this._config = resolver.getInstance(BlockPuzzleConfig);
  }

  public override postInitialize(): void {
    super.postInitialize();

    this._scoreLabel = this.buildHudLabel("Score: 0", TITLE_LABEL_SIZE);
    this._scoreLabel.layout = { position: "absolute", left: HUD_LABEL_MARGIN, top: HUD_LABEL_MARGIN };
    this.addChild(this._scoreLabel);

    this._timeLabel = this.buildHudLabel("00:00", HUD_LABEL_SIZE);
    this._timeLabel.layout = { position: "absolute", right: HUD_LABEL_MARGIN, top: HUD_LABEL_MARGIN };
    this.addChild(this._timeLabel);

    this._comboContainer = this.buildComboWidget();
    this.addChild(this._comboContainer);

    this._endStateLabel = this.buildEndStateLabel();
    this._endStateLabel.visible = false;
    this.addChild(this._endStateLabel);

    // Initial paint — combo starts inactive.
    this.setComboState({ level: 0, movesRemaining: 0 });
  }

  public override onResize(width: number, height: number, dpr: number): void {
    super.onResize(width, height, dpr);
    // Absolute-positioned children resolve against the screen's own
    // layout box, so the screen needs explicit width/height every
    // time the canvas changes size. Without this the children stack
    // at (0, 0).
    this.layout = { width: Math.max(1, width), height: Math.max(1, height) };

    const w = Math.max(1, width);
    const h = Math.max(1, height);

    if (this._comboContainer && this._config) {
      // Centre horizontally; vertical position is the **top** of the
      // widget (the label's top edge). The widget lays itself out
      // downward from there: label first, then `labelGapAbove`, then
      // the row of circles.
      this._comboContainer.x = w / 2;
      this._comboContainer.y = this._config.combo.topMargin;
    }
    if (this._endStateLabel) {
      // Anchored at (0.5, 0.5); position via raw x/y rather than
      // layout so centering doesn't depend on a flex container.
      this._endStateLabel.x = w / 2;
      this._endStateLabel.y = h / 2;
    }
  }

  public setScoreText(text: string): void {
    this._scoreLabel?.setText(text);
  }

  public setTimeText(text: string): void {
    this._timeLabel?.setText(text);
  }

  public setComboState(state: ComboHudState): void {
    if (!this._config || this._comboContainer === null || this._comboLabel === null) return;
    const combo = this._config.combo;

    // Circle colours — circles at indices [0, movesRemaining) are
    // active; the rest are inactive. Depletion reads as "rightmost
    // circle goes gray first" because the active band shrinks from
    // the right.
    for (let i = 0; i < this._comboCircles.length; i++) {
      const active = i < state.movesRemaining;
      this._paintCircle(this._comboCircles[i]!, combo.circleRadius, active ? combo.circleColorActive : combo.circleColorInactive);
    }

    // Label visibility + text — hidden when inactive, "COMBO READY"
    // on the first hit (level 1), "COMBO Xn" on subsequent hits.
    if (state.level <= 0) {
      this._comboLabel.visible = false;
    } else {
      this._comboLabel.visible = true;
      this._comboLabel.setText(state.level === 1 ? "COMBO READY" : `COMBO X${state.level}`);
    }
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

  private buildComboWidget(): Container {
    if (!this._config) throw new Error("GameScreenView: config not injected before postInitialize");
    const combo = this._config.combo;
    const container = new Container();

    // Container origin = top of widget. Layout is top-down:
    //   - Label at y = 0 (anchorY = 0 so its top edge sits there).
    //   - Gap of `labelGapAbove`.
    //   - Circle row centres at y = labelFontSize + labelGapAbove + circleRadius.
    const labelStyle = this.styleManager.resolve<LabelComponentStyle>(UIComponentsStyleIds.Label, {
      text: { fontSize: combo.labelFontSize, fontWeight: "700", color: combo.labelColor },
    });
    this._comboLabel = new LabelComponent(this.assetLoader, labelStyle, {
      text: "",
      anchorX: 0.5,
      anchorY: 0,
    });
    this._comboLabel.x = 0;
    this._comboLabel.y = 0;
    this._comboLabel.visible = false;
    container.addChild(this._comboLabel);

    // Circle row, centres at the vertical position derived above.
    // Horizontal: index `i` lands at `(i - (N-1)/2) * step` where
    // `step = diameter + spacing`.
    const step = combo.circleRadius * 2 + combo.circleSpacing;
    const circleY = combo.labelFontSize + combo.labelGapAbove + combo.circleRadius;
    for (let i = 0; i < combo.maxMoves; i++) {
      const circle = new Graphics();
      circle.x = (i - (combo.maxMoves - 1) / 2) * step;
      circle.y = circleY;
      this._paintCircle(circle, combo.circleRadius, combo.circleColorInactive);
      container.addChild(circle);
      this._comboCircles.push(circle);
    }

    return container;
  }

  private _paintCircle(g: Graphics, radius: number, color: number): void {
    g.clear();
    g.circle(0, 0, radius).fill(color);
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
