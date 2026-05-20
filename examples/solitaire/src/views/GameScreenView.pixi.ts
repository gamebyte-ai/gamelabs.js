import * as PIXI from "pixi.js";
import {
  RadioButtonGroupComponent,
  ScreenView,
  UIComponentsStyleIds,
  type RadioButtonComponentStyle,
  type Unsubscribe,
} from "@gamebyte/gamelabsjs";
import type { IGameScreenView } from "./IGameScreenView";

// Undo button sizing and styling. Values are screen-space pixels and
// pinned to the bottom-right corner via the framework's flex/absolute
// layout. The palette matches the tableau slot palette so the HUD
// reads as part of the same game surface.
const UNDO_BUTTON_WIDTH = 96;
const UNDO_BUTTON_HEIGHT = 44;
const UNDO_BUTTON_RADIUS = 8;
const UNDO_BUTTON_FILL = 0x4a3a1a;
const UNDO_BUTTON_OUTLINE = 0xe2b54a;
const UNDO_BUTTON_OUTLINE_WIDTH = 2;
const UNDO_BUTTON_LABEL_COLOR = 0xffffff;
const UNDO_BUTTON_LABEL_SIZE = 18;
const UNDO_BUTTON_MARGIN = 16;

// Score / time HUD label styling. Same font family as the button
// label so the HUD reads as a single typographic family. The score
// pins to the top-left, the time to the top-right. Values are
// pushed in pre-formatted by the screen controller.
const HUD_LABEL_COLOR = 0xffffff;
const HUD_LABEL_SIZE = 22;
const HUD_LABEL_MARGIN = 16;
const HUD_LABEL_FONT_FAMILY = "system-ui, -apple-system, Segoe UI, Roboto, Arial";

// Centered end-state overlay. Larger than the other HUD labels so a
// terminal state reads clearly over the board layout. Text and tint
// are both picked by the screen controller per state — red for
// "Time is Over", green for "You Win!", and so on.
const END_STATE_LABEL_SIZE = 56;

// Turn 1 / Turn 3 radio group sits in the bottom-left corner, mirror
// of the undo button at bottom-right. Uses the framework's
// RadioButtonGroupComponent with the default radio skin from
// UIComponentsBinding — group owns mutual exclusion, silent
// programmatic updates, and no-op-on-reselect.
const TURN_GROUP_MARGIN = 16;
const TURN_GROUP_SPACING = 20;
// Stable per-item ids; mapped to/from the runtime drawCount value.
const TURN_ITEM_ID_1 = "turn-1";
const TURN_ITEM_ID_3 = "turn-3";

export class GameScreenView extends ScreenView implements IGameScreenView {
  private readonly _overlay = new PIXI.Graphics();
  private readonly _undoButton = new PIXI.Container();
  private readonly _undoListeners = new Set<() => void>();
  private readonly _drawCountListeners = new Set<(drawCount: number) => void>();
  private _scoreLabel: PIXI.Text | null = null;
  private _timeLabel: PIXI.Text | null = null;
  private _endStateLabel: PIXI.Text | null = null;
  private _turnGroup: RadioButtonGroupComponent | null = null;
  private _turnGroupUnsub: Unsubscribe | null = null;

  public override postInitialize(): void {
    super.postInitialize();

    this._overlay.layout = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" };
    if (!this._overlay.parent) this.addChild(this._overlay);

    this._scoreLabel = this.buildHudLabel("Score: 0", { left: HUD_LABEL_MARGIN, top: HUD_LABEL_MARGIN });
    this.addChild(this._scoreLabel);
    this._timeLabel = this.buildHudLabel("00:00", { right: HUD_LABEL_MARGIN, top: HUD_LABEL_MARGIN });
    this.addChild(this._timeLabel);

    this._endStateLabel = new PIXI.Text({
      text: "",
      style: {
        fill: 0xffffff,
        fontSize: END_STATE_LABEL_SIZE,
        fontFamily: HUD_LABEL_FONT_FAMILY,
        fontWeight: "700",
      },
    });
    this._endStateLabel.anchor.set(0.5);
    this._endStateLabel.visible = false;
    this.addChild(this._endStateLabel);

    this.buildUndoButton();
    if (!this._undoButton.parent) this.addChild(this._undoButton);

    this.buildTurnRadioGroup();
  }

  public override onResize(width: number, height: number, dpr: number): void {
    super.onResize(width, height, dpr);

    this.layout = {
      width: Math.max(1, width),
      height: Math.max(1, height),
      flexDirection: "column",
      justifyContent: "flex-start",
      padding: 16,
      gap: 12,
    };

    this._overlay.clear();
    this._overlay.rect(0, 0, Math.max(1, width), Math.max(1, height)).fill({ color: 0x000000, alpha: 0 });

    if (this._endStateLabel) {
      // Anchored at (0.5, 0.5); position via raw x/y rather than
      // layout so we don't depend on the flex container's resolved
      // size for centering.
      this._endStateLabel.x = Math.max(1, width) / 2;
      this._endStateLabel.y = Math.max(1, height) / 2;
    }
  }

  public onUndoClicked(callback: () => void): Unsubscribe {
    this._undoListeners.add(callback);
    return () => {
      this._undoListeners.delete(callback);
    };
  }

  public setScoreText(text: string): void {
    if (this._scoreLabel) this._scoreLabel.text = text;
  }

  public setTimeText(text: string): void {
    if (this._timeLabel) this._timeLabel.text = text;
  }

  public setEndStateLabel(appearance: { readonly text: string; readonly color: number } | null): void {
    if (!this._endStateLabel) return;
    if (appearance === null) {
      this._endStateLabel.visible = false;
      return;
    }
    this._endStateLabel.text = appearance.text;
    this._endStateLabel.style.fill = appearance.color;
    this._endStateLabel.visible = true;
  }

  public setDrawCountMode(drawCount: number): void {
    // Silent on the group — does not trigger onChange, so this
    // controller-driven sync never loops back into the listener.
    this._turnGroup?.setSelectedId(GameScreenView.idFromDrawCount(drawCount));
  }

  public onDrawCountSelected(callback: (drawCount: number) => void): Unsubscribe {
    this._drawCountListeners.add(callback);
    return () => {
      this._drawCountListeners.delete(callback);
    };
  }

  public override preDestroy(): void {
    this._undoListeners.clear();
    this._drawCountListeners.clear();
    this._undoButton.removeAllListeners();
    this._turnGroupUnsub?.();
    this._turnGroupUnsub = null;
    super.preDestroy();
  }

  private buildUndoButton(): void {
    this._undoButton.eventMode = "static";
    this._undoButton.cursor = "pointer";
    this._undoButton.layout = {
      position: "absolute",
      right: UNDO_BUTTON_MARGIN,
      bottom: UNDO_BUTTON_MARGIN,
      width: UNDO_BUTTON_WIDTH,
      height: UNDO_BUTTON_HEIGHT,
    };

    const bg = new PIXI.Graphics();
    bg.roundRect(0, 0, UNDO_BUTTON_WIDTH, UNDO_BUTTON_HEIGHT, UNDO_BUTTON_RADIUS);
    bg.fill({ color: UNDO_BUTTON_FILL });
    bg.stroke({ color: UNDO_BUTTON_OUTLINE, width: UNDO_BUTTON_OUTLINE_WIDTH });
    this._undoButton.addChild(bg);

    const label = new PIXI.Text({
      text: "Undo",
      style: {
        fill: UNDO_BUTTON_LABEL_COLOR,
        fontSize: UNDO_BUTTON_LABEL_SIZE,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        fontWeight: "600",
      },
    });
    label.anchor.set(0.5);
    label.x = UNDO_BUTTON_WIDTH / 2;
    label.y = UNDO_BUTTON_HEIGHT / 2;
    this._undoButton.addChild(label);

    this._undoButton.on("pointertap", () => {
      for (const cb of this._undoListeners) cb();
    });
  }

  /**
   * Builds the framework `RadioButtonGroupComponent` with two items
   * (Turn 1, Turn 3) using the default radio skin from
   * `UIComponentsBinding`. The group owns the mutual-exclusion model,
   * silent programmatic selection (`setSelectedId`), and the
   * no-op-on-reselect semantics; we only forward its `onChange` to
   * external listeners after mapping the item id back to a drawCount.
   */
  private buildTurnRadioGroup(): void {
    const style = this.styleManager.resolve<RadioButtonComponentStyle>(UIComponentsStyleIds.RadioButton);
    this._turnGroup = new RadioButtonGroupComponent(this.assetLoader, style, {
      items: [
        { id: TURN_ITEM_ID_1, label: "Turn 1" },
        { id: TURN_ITEM_ID_3, label: "Turn 3" },
      ],
      selectedId: TURN_ITEM_ID_3,
      direction: "row",
      spacing: TURN_GROUP_SPACING,
    });
    this._turnGroup.layout = {
      position: "absolute",
      left: TURN_GROUP_MARGIN,
      bottom: TURN_GROUP_MARGIN,
    };
    this._turnGroupUnsub = this._turnGroup.onChange((id) => {
      const drawCount = GameScreenView.drawCountFromId(id);
      if (drawCount === null) return;
      for (const cb of this._drawCountListeners) cb(drawCount);
    });
    this.addChild(this._turnGroup);
  }

  private static idFromDrawCount(drawCount: number): string {
    return drawCount === 1 ? TURN_ITEM_ID_1 : TURN_ITEM_ID_3;
  }

  private static drawCountFromId(id: string): number | null {
    if (id === TURN_ITEM_ID_1) return 1;
    if (id === TURN_ITEM_ID_3) return 3;
    return null;
  }

  private buildHudLabel(
    initialText: string,
    position: { readonly left?: number; readonly right?: number; readonly top: number },
  ): PIXI.Text {
    const label = new PIXI.Text({
      text: initialText,
      style: {
        fill: HUD_LABEL_COLOR,
        fontSize: HUD_LABEL_SIZE,
        fontFamily: HUD_LABEL_FONT_FAMILY,
        fontWeight: "600",
      },
    });
    label.layout = {
      position: "absolute",
      ...(position.left !== undefined ? { left: position.left } : {}),
      ...(position.right !== undefined ? { right: position.right } : {}),
      top: position.top,
    };
    return label;
  }
}
