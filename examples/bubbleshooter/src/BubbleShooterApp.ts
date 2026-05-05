import {
  AssetRequest,
  AssetRequestList,
  AssetTypes,
  ControlAnchor,
  ControlType,
  Front2dCameraController,
  GameCameraBinding,
  GameCameraManager,
  GamelabsApp,
  LogTypes,
  OnScreenControlManager,
  OnScreenControlsBinding,
  SettingsBinding,
  SettingsBooleanField,
  SettingsManager,
  SettingsNumberField,
  SettingsUIIds,
  UIComponentsBinding,
  UIEvents,
  World,
  type VirtualButtonConfig,
  type VirtualLabelConfig,
} from "@gamebyte/gamelabsjs";

import { BubbleShooterAssetIds } from "./BubbleShooterAssetIds";
import { BubbleShooterConfig } from "./BubbleShooterConfig";
import { BubbleShooterUIIds } from "./BubbleShooterUIIds";
import { BubbleGridLayout } from "./utilities/BubbleGridLayout";
import { BubbleGrid } from "./models/BubbleGrid";
import { IBubbleGrid } from "./models/IBubbleGrid";
import { Shooter } from "./models/Shooter";
import { IShooter } from "./models/IShooter";
import { Score } from "./models/Score";
import { IScore } from "./models/IScore";
import { GameEvents } from "./events/GameEvents";
import { GameOperations } from "./utilities/GameOperations";
import { AimTrajectoryCalculator } from "./utilities/AimTrajectoryCalculator";
import { MatchFinder } from "./utilities/MatchFinder";
import { FloatingBubbleFinder } from "./utilities/FloatingBubbleFinder";
import { GameAreaView } from "./views/GameAreaView.three";
import { GameAreaViewController } from "./controllers/GameAreaViewController";
import { PlayAreaClipping } from "./views/PlayAreaClipping";
import { GameScreenView } from "./views/GameScreenView.pixi";
import { GameScreenViewController } from "./controllers/GameScreenViewController";
import { EffectsView } from "./views/EffectsView.three";
import { EffectsViewController } from "./controllers/EffectsViewController";
import { FallingBubblesView } from "./views/FallingBubblesView.three";
import { FallingBubblesViewController } from "./controllers/FallingBubblesViewController";
import { FlightView } from "./views/FlightView.three";
import { FlightViewController } from "./controllers/FlightViewController";
import { AimLineView } from "./views/AimLineView.three";
import { AimLineViewController } from "./controllers/AimLineViewController";
import { BubbleGridView } from "./views/BubbleGridView.three";
import { BubbleGridViewController } from "./controllers/BubbleGridViewController";
import { ShooterView } from "./views/ShooterView.three";
import { ShooterViewController } from "./controllers/ShooterViewController";
import { HudHookupManager } from "./utilities/HudHookupManager";
import { SettingsHookupManager } from "./utilities/SettingsHookupManager";
import { SoundManager } from "./utilities/SoundManager";
import { SoundSynth } from "./utilities/SoundSynth";

// Power-up button layout. Bomb is anchored to BottomRight; future
// power-ups stack to its LEFT by adding `(POWER_UP_SIZE + GAP)` to
// the offsetX of each successive button.
const POWER_UP_SIZE = 60;
const POWER_UP_GAP = 14;
const POWER_UP_OFFSET_Y = 70;
const POWER_UP_BOMB_OFFSET_X = 60;
const POWER_UP_FIREBALL_OFFSET_X = POWER_UP_BOMB_OFFSET_X + POWER_UP_SIZE + POWER_UP_GAP;
/** Half-button inset toward the top-right corner of a button (where the count badge sits). */
const POWER_UP_COUNT_INSET = 22;

// Settings (gear) button layout — TopRight, screen-anchored. Sized
// slightly smaller than the power-up buttons so the corner badge feels
// like a secondary affordance. The level dropdown in `GameScreenView`
// is positioned just below this button (top = SETTINGS_OFFSET_Y +
// SETTINGS_SIZE + small gap), so changing this size needs the
// dropdown's `top` re-tuned to match.
const SETTINGS_SIZE = 50;
const SETTINGS_OFFSET_X = 16;
const SETTINGS_OFFSET_Y = 16;

/**
 * Bubble Shooter scaffold.
 *
 * Step 3 in a multi-step build: play area + empty grid + initial bubble
 * layout from earlier steps, plus a shooter at the bottom-centre that
 * holds a random-coloured bubble, rotates to track the cursor, and shows
 * a dotted aim line that reflects off the side walls and stops at the
 * top wall or the first bubble it would touch. No firing yet.
 */
export class BubbleShooterApp extends GamelabsApp {
  private readonly _assetRequestList = new AssetRequestList();
  private readonly _config = new BubbleShooterConfig();
  private readonly _layout = new BubbleGridLayout(this._config);
  private readonly _grid = new BubbleGrid(this._layout);
  private readonly _shooter = new Shooter();
  private readonly _score = new Score();
  private readonly _gameEvents = new GameEvents();
  private readonly _gameCameraBinding = new GameCameraBinding();
  private readonly _onScreenControlsBinding = new OnScreenControlsBinding();
  private readonly _uiComponentsBinding = new UIComponentsBinding();
  // SettingsBinding registers the framework SettingsManager + popup
  // view/controller. We pass `defaults: false` because the bubble
  // shooter only exposes SFX-related fields (no music yet) — the
  // matching `addField(...)` calls live in postInitialize.
  private readonly _settingsBinding = new SettingsBinding();

  private _gameAreaView: GameAreaView | null = null;
  private _cameraManager: GameCameraManager | null = null;
  private _cameraController: Front2dCameraController | null = null;
  private _soundManager: SoundManager | null = null;
  private _hudHookupManager: HudHookupManager | null = null;
  private _settingsHookupManager: SettingsHookupManager | null = null;
  private _layoutChangedUnsub: (() => void) | null = null;

  // Power-up button + count configs are kept by reference so resize can
  // reposition them against the play area's bottom-right corner (rather
  // than the screen's), by mutating offsetX/Y in place. The OSC view
  // re-reads these on its next reposition (driven by AppEvents.onResize).
  private _bombButtonConfig: VirtualButtonConfig | null = null;
  private _bombCountConfig: VirtualLabelConfig | null = null;
  private _fireballButtonConfig: VirtualButtonConfig | null = null;
  private _fireballCountConfig: VirtualLabelConfig | null = null;

  public constructor(stageEl: HTMLElement) {
    super({ mount: stageEl });
  }

  protected override registerModules(): void {
    this.addModule(this._gameCameraBinding);
    this.addModule(this._onScreenControlsBinding);
    this.addModule(this._uiComponentsBinding);
    this.addModule(this._settingsBinding);
  }

  protected override configureDI(): void {
    if (!this.world) {
      this.logger.log("World is not initialized", LogTypes.Error);
      throw new Error("World is not initialized");
    }
    this.viewDiContainer.bindInstance(World, this.world);

    this.diContainer.bindInstance(BubbleShooterConfig, this._config);
    this.viewDiContainer.bindInstance(BubbleShooterConfig, this._config);
    this.diContainer.bindInstance(BubbleGridLayout, this._layout);
    this.viewDiContainer.bindInstance(BubbleGridLayout, this._layout);
    this.diContainer.bindInstance(BubbleGrid, this._grid, [IBubbleGrid]);
    this.diContainer.bindInstance(Shooter, this._shooter, [IShooter]);
    this.diContainer.bindInstance(Score, this._score, [IScore]);
    this.diContainer.bindInstance(GameEvents, this._gameEvents);
    // Shared bubble-clipping planes — view-side only, so just the
    // viewDiContainer. Each bubble-drawing sub-view pulls the same
    // instance and assigns its `.planes` to every bubble material.
    this.viewDiContainer.bindInstance(PlayAreaClipping, new PlayAreaClipping(this._layout));

    // Top-left score readout via the on-screen-controls Label widget.
    const osc = this.diContainer.getInstance(OnScreenControlManager);
    osc.addControl({
      type: ControlType.Label,
      id: BubbleShooterUIIds.ScoreLabel,
      anchor: ControlAnchor.TopLeft,
      offsetX: 16,
      offsetY: 16,
      content: "Score: 0",
      text: { color: 0xffffff, fontSize: 22, fontWeight: "700" },
    });
    // Centre-of-screen "YOU WIN!" overlay, hidden until the grid clears.
    osc.addControl({
      type: ControlType.Label,
      id: BubbleShooterUIIds.WinLabel,
      anchor: ControlAnchor.Center,
      offsetX: 0,
      offsetY: 0,
      anchorX: 0.5,
      anchorY: 0.5,
      content: "YOU WIN!",
      text: { color: 0xfff2a0, fontSize: 64, fontWeight: "800" },
    });
    osc.setControlVisible(BubbleShooterUIIds.WinLabel, false);
    // Centre-of-screen "GAME OVER" overlay, hidden until a bubble
    // settles in the bottom row.
    osc.addControl({
      type: ControlType.Label,
      id: BubbleShooterUIIds.GameOverLabel,
      anchor: ControlAnchor.Center,
      offsetX: 0,
      offsetY: 0,
      anchorX: 0.5,
      anchorY: 0.5,
      content: "GAME OVER",
      text: { color: 0xff6464, fontSize: 64, fontWeight: "800" },
    });
    osc.setControlVisible(BubbleShooterUIIds.GameOverLabel, false);
    // Power-up buttons stack at the bottom-right. Bomb is rightmost;
    // future power-ups (currently fireball) sit to its LEFT by
    // increasing offsetX (BottomRight: bigger offsetX = further LEFT).
    // Each button gets a separate count Label sitting at the top-right
    // corner of the button — the framework Button widget has no text
    // overlay, so a Label per badge is the cleanest path.
    // Power-up buttons + count badges. Offsets here are placeholders;
    // _layoutPowerUpButtons computes the real values against the play
    // area's bottom-right corner on each resize.
    this._bombButtonConfig = {
      type: ControlType.Button,
      id: BubbleShooterUIIds.BombButton,
      anchor: ControlAnchor.BottomRight,
      offsetX: POWER_UP_BOMB_OFFSET_X,
      offsetY: POWER_UP_OFFSET_Y,
      size: POWER_UP_SIZE,
      icon: { textureId: BubbleShooterAssetIds.BombIcon, scaleX: 0.7, scaleY: 0.7 },
    };
    osc.addControl(this._bombButtonConfig);
    this._bombCountConfig = {
      type: ControlType.Label,
      id: BubbleShooterUIIds.BombCountLabel,
      anchor: ControlAnchor.BottomRight,
      offsetX: POWER_UP_BOMB_OFFSET_X - POWER_UP_COUNT_INSET,
      offsetY: POWER_UP_OFFSET_Y + POWER_UP_COUNT_INSET,
      anchorX: 0.5,
      anchorY: 0.5,
      content: "3",
      text: { color: 0xffffff, fontSize: 18, fontWeight: "700" },
    };
    osc.addControl(this._bombCountConfig);
    this._fireballButtonConfig = {
      type: ControlType.Button,
      id: BubbleShooterUIIds.FireballButton,
      anchor: ControlAnchor.BottomRight,
      offsetX: POWER_UP_FIREBALL_OFFSET_X,
      offsetY: POWER_UP_OFFSET_Y,
      size: POWER_UP_SIZE,
      icon: { textureId: BubbleShooterAssetIds.FireballIcon, scaleX: 0.7, scaleY: 0.7 },
    };
    osc.addControl(this._fireballButtonConfig);
    this._fireballCountConfig = {
      type: ControlType.Label,
      id: BubbleShooterUIIds.FireballCountLabel,
      anchor: ControlAnchor.BottomRight,
      offsetX: POWER_UP_FIREBALL_OFFSET_X - POWER_UP_COUNT_INSET,
      offsetY: POWER_UP_OFFSET_Y + POWER_UP_COUNT_INSET,
      anchorX: 0.5,
      anchorY: 0.5,
      content: "3",
      text: { color: 0xffffff, fontSize: 18, fontWeight: "700" },
    };
    osc.addControl(this._fireballCountConfig);
    // Top-right settings (gear) button. Opens the framework
    // SettingsPopup via UIEvents.createPopup in postInitialize. The
    // dev-only level dropdown in GameScreenView is positioned to sit
    // just below this button.
    osc.addControl({
      type: ControlType.Button,
      id: BubbleShooterUIIds.SettingsButton,
      anchor: ControlAnchor.TopRight,
      offsetX: SETTINGS_OFFSET_X,
      offsetY: SETTINGS_OFFSET_Y,
      size: SETTINGS_SIZE,
      icon: { textureId: BubbleShooterAssetIds.SettingsIcon, scaleX: 0.7, scaleY: 0.7 },
    });
    this.diContainer.bindSingleton(AimTrajectoryCalculator, () => new AimTrajectoryCalculator());
    this.diContainer.bindSingleton(MatchFinder, () => new MatchFinder());
    this.diContainer.bindSingleton(FloatingBubbleFinder, () => new FloatingBubbleFinder());
    this.diContainer.bindSingleton(GameOperations, () => new GameOperations());
  }

  protected override configureViews(): void {
    this.viewFactory.registerScreen(BubbleShooterUIIds.GameScreen, GameScreenView, GameScreenViewController);
    this.viewFactory.register(GameAreaView, GameAreaViewController);
    this.viewFactory.register(EffectsView, EffectsViewController);
    this.viewFactory.register(FallingBubblesView, FallingBubblesViewController);
    this.viewFactory.register(FlightView, FlightViewController);
    this.viewFactory.register(AimLineView, AimLineViewController);
    this.viewFactory.register(BubbleGridView, BubbleGridViewController);
    this.viewFactory.register(ShooterView, ShooterViewController);
  }

  protected override loadAssets(): void {
    this._assetRequestList.addRequest(
      new AssetRequest(AssetTypes.WorldTexture, BubbleShooterAssetIds.BubbleRed, new URL("../assets/bubbles/red.svg", import.meta.url).href),
    );
    this._assetRequestList.addRequest(
      new AssetRequest(AssetTypes.WorldTexture, BubbleShooterAssetIds.BubbleBlue, new URL("../assets/bubbles/blue.svg", import.meta.url).href),
    );
    this._assetRequestList.addRequest(
      new AssetRequest(AssetTypes.WorldTexture, BubbleShooterAssetIds.BubbleGreen, new URL("../assets/bubbles/green.svg", import.meta.url).href),
    );
    this._assetRequestList.addRequest(
      new AssetRequest(AssetTypes.WorldTexture, BubbleShooterAssetIds.BubbleYellow, new URL("../assets/bubbles/yellow.svg", import.meta.url).href),
    );
    this._assetRequestList.addRequest(
      new AssetRequest(AssetTypes.WorldTexture, BubbleShooterAssetIds.BubblePurple, new URL("../assets/bubbles/purple.svg", import.meta.url).href),
    );
    this._assetRequestList.addRequest(
      new AssetRequest(AssetTypes.WorldTexture, BubbleShooterAssetIds.BubbleStone, new URL("../assets/bubbles/stone.svg", import.meta.url).href),
    );
    this._assetRequestList.addRequest(
      new AssetRequest(AssetTypes.WorldTexture, BubbleShooterAssetIds.SwapIcon, new URL("../assets/swap-icon.svg", import.meta.url).href),
    );
    // Power-up sprites: each SVG is loaded twice (world for the
    // held / flying mesh, HUD for the OSC button icon).
    const bombUrl = new URL("../assets/bomb.svg", import.meta.url).href;
    this._assetRequestList.addRequest(
      new AssetRequest(AssetTypes.WorldTexture, BubbleShooterAssetIds.BombBubble, bombUrl),
    );
    this._assetRequestList.addRequest(
      new AssetRequest(AssetTypes.HudTexture, BubbleShooterAssetIds.BombIcon, bombUrl),
    );
    const fireballUrl = new URL("../assets/fireball.svg", import.meta.url).href;
    this._assetRequestList.addRequest(
      new AssetRequest(AssetTypes.WorldTexture, BubbleShooterAssetIds.FireballBubble, fireballUrl),
    );
    this._assetRequestList.addRequest(
      new AssetRequest(AssetTypes.HudTexture, BubbleShooterAssetIds.FireballIcon, fireballUrl),
    );
    this._assetRequestList.addRequest(
      new AssetRequest(
        AssetTypes.HudTexture,
        BubbleShooterAssetIds.SettingsIcon,
        new URL("../assets/settings.svg", import.meta.url).href,
      ),
    );
    this.assetManager.loadAll(this._assetRequestList.getRequests());
    this._registerSoundBuffers();
  }

  /**
   * Synthesise SFX buffers off the AudioContext and register them
   * directly with the AssetManager. We bypass the normal request /
   * load pipeline because the buffers are generated in-process — no
   * network fetch needed — and `setAsset` makes them visible to
   * `AudioService.playSfx(assetId)` immediately.
   */
  private _registerSoundBuffers(): void {
    const ctx = this.audioService.context;
    if (!ctx) {
      this.logger.log("AudioContext unavailable; SFX disabled", LogTypes.Warning);
      return;
    }
    const am = this.assetManager;
    am.setAsset(BubbleShooterAssetIds.SoundPop, SoundSynth.buildPop(ctx));
    am.setAsset(BubbleShooterAssetIds.SoundSnap, SoundSynth.buildSnap(ctx));
    am.setAsset(BubbleShooterAssetIds.SoundShoot, SoundSynth.buildShoot(ctx));
    am.setAsset(BubbleShooterAssetIds.SoundBomb, SoundSynth.buildBomb(ctx));
    am.setAsset(BubbleShooterAssetIds.SoundFireball, SoundSynth.buildFireball(ctx));
    am.setAsset(BubbleShooterAssetIds.SoundSwap, SoundSynth.buildSwap(ctx));
  }

  protected override postInitialize(): void {
    if (!this.world || !this.hud) {
      this.logger.log("World or HUD is not initialized", LogTypes.Error);
      throw new Error("World or HUD is not initialized");
    }

    this._gameAreaView = this.viewFactory.createView(GameAreaView);
    this.world.addView(this._gameAreaView);

    this._cameraManager = this.diContainer.getInstance(GameCameraManager);
    this._cameraManager.initialize(this.world);
    this._cameraController = new Front2dCameraController(this._cameraManager).register();
    this._cameraController.followPosition(0, 0, this._config.cameraFocusZ);
    this._fitCamera(this.width, this.height);
    this._layoutPowerUpButtons(this.width, this.height);

    this.diContainer.getInstance(UIEvents).createScreen(BubbleShooterUIIds.GameScreen, this._config.transitions.gameScreenEnter);

    // Wire the bomb button: ops is resolvable now that DI is fully
    // configured. Single-shot on press; the manager's key handler
    // pattern fires both on press and release with `isPressed`.
    const osc = this.diContainer.getInstance(OnScreenControlManager);
    const ops = this.diContainer.getInstance(GameOperations);
    osc.addKeyHandler(BubbleShooterUIIds.BombButton, (isPressed) => {
      if (isPressed) ops.activateBomb();
    });
    osc.addKeyHandler(BubbleShooterUIIds.FireballButton, (isPressed) => {
      if (isPressed) ops.activateFireball();
    });
    // Register SFX-only settings fields, then wire the gear button to
    // open the framework SettingsPopup. Field names match the
    // framework defaults so a future switch to `SettingsBinding({
    // defaults: true })` would override these without breaking the
    // hookup manager.
    const settingsManager = this.diContainer.getInstance(SettingsManager);
    settingsManager.addField(new SettingsBooleanField("sfx", "Sound Effects", true));
    settingsManager.addField(new SettingsNumberField("sfxVolume", "SFX Volume", 100, 0, 100, 5));
    const uiEvents = this.diContainer.getInstance(UIEvents);
    osc.addKeyHandler(BubbleShooterUIIds.SettingsButton, (isPressed) => {
      if (isPressed) uiEvents.createPopup(SettingsUIIds.SettingsPopup);
    });

    this._soundManager = new SoundManager();
    this._soundManager.inject(this.diContainer);
    this._soundManager.start();

    this._hudHookupManager = new HudHookupManager();
    this._hudHookupManager.inject(this.diContainer);
    this._hudHookupManager.start();

    // Settings → AudioService bridge. Applies persisted sfx + volume
    // values up front and re-applies on every settings change.
    this._settingsHookupManager = new SettingsHookupManager();
    this._settingsHookupManager.inject(this.diContainer);
    this._settingsHookupManager.start();

    // Camera fit + power-up button positions both depend on the
    // play area's width. Re-run them on every layout change so a
    // per-level `wideRowColumns` override resizes the visible area
    // and re-anchors the HUD buttons to the new corner.
    this._layoutChangedUnsub = this._gameEvents.onLayoutChanged(() => this._onLayoutChanged());
  }

  private _onLayoutChanged(): void {
    this._fitCamera(this.width, this.height);
    this._layoutPowerUpButtons(this.width, this.height);
  }

  protected override onResize(width: number, height: number, dpr: number): void {
    super.onResize(width, height, dpr);
    this._cameraManager?.resize(width, height);
    this._fitCamera(width, height);
    this._layoutPowerUpButtons(width, height);
  }

  /**
   * Reposition the power-up buttons + count badges against the play
   * area's bottom-right corner (in screen pixels), not the screen's.
   * The OSC manager re-reads `config.offsetX/Y` on every reposition,
   * so mutating them in place + relying on the screen view's onResize
   * → OSC reposition flow is enough to update visuals.
   *
   * Math: with the camera ortho-fit so `pxPerWorld = h / orthoSize`,
   * the play area's right edge sits at `w/2 + halfAreaW * pxPerWorld`
   * and its bottom at `h/2 + halfAreaH * pxPerWorld`. BottomRight
   * offsets are measured from the screen's right / bottom edges
   * inward, so subtract that span and add an inset to land button
   * centres just inside the play-area corner.
   */
  private _layoutPowerUpButtons(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;
    const aspect = width / height;
    const requiredW = this._layout.areaWidth + 2 * this._config.cameraMargin;
    const requiredH = this._layout.areaHeight + 2 * this._config.cameraMargin;
    const orthoSize = Math.max(requiredH, requiredW / aspect);
    const pxPerWorld = height / orthoSize;

    const offsetXBase = width / 2 - this._layout.halfAreaWidth * pxPerWorld;
    const offsetYBase = height / 2 - this._layout.halfAreaHeight * pxPerWorld;
    const inset = POWER_UP_SIZE / 2 + 8;
    const bombOffsetX = offsetXBase + inset;
    const bombOffsetY = offsetYBase + inset;
    const fireballOffsetX = bombOffsetX + POWER_UP_SIZE + POWER_UP_GAP;
    const fireballOffsetY = bombOffsetY;

    if (this._bombButtonConfig) {
      this._bombButtonConfig.offsetX = bombOffsetX;
      this._bombButtonConfig.offsetY = bombOffsetY;
    }
    if (this._bombCountConfig) {
      this._bombCountConfig.offsetX = bombOffsetX - POWER_UP_COUNT_INSET;
      this._bombCountConfig.offsetY = bombOffsetY + POWER_UP_COUNT_INSET;
    }
    if (this._fireballButtonConfig) {
      this._fireballButtonConfig.offsetX = fireballOffsetX;
      this._fireballButtonConfig.offsetY = fireballOffsetY;
    }
    if (this._fireballCountConfig) {
      this._fireballCountConfig.offsetX = fireballOffsetX - POWER_UP_COUNT_INSET;
      this._fireballCountConfig.offsetY = fireballOffsetY + POWER_UP_COUNT_INSET;
    }
  }

  /**
   * Pick an ortho size that always fits the play area plus a uniform margin
   * on every side. With ortho conventions `visible_h = orthoSize` and
   * `visible_w = orthoSize * aspect`, both spans must clear the area extents.
   */
  private _fitCamera(screenWidth: number, screenHeight: number): void {
    if (screenWidth <= 0 || screenHeight <= 0) return;
    const aspect = screenWidth / screenHeight;
    const areaWidth = this._layout.gridWidth + 2 * this._config.playAreaPaddingX;
    const areaHeight = this._layout.gridHeight + this._config.playAreaPaddingTop + this._config.playAreaPaddingBottom;
    const requiredW = areaWidth + 2 * this._config.cameraMargin;
    const requiredH = areaHeight + 2 * this._config.cameraMargin;
    const orthoForHeight = requiredH;
    const orthoForWidth = requiredW / aspect;
    this._cameraManager?.setOrthoSize(Math.max(orthoForHeight, orthoForWidth));
  }

  protected override onStep(timestepSeconds: number): void {
    super.onStep(timestepSeconds);
    this._cameraManager?.update(timestepSeconds);
  }

  protected override preDestroy(): void {
    this._layoutChangedUnsub?.();
    this._layoutChangedUnsub = null;
    this._settingsHookupManager?.destroy();
    this._settingsHookupManager = null;
    this._hudHookupManager?.destroy();
    this._hudHookupManager = null;
    this._soundManager?.destroy();
    this._soundManager = null;
    this._cameraController = null;
    this._gameAreaView?.destroy();
    this._gameAreaView = null;
    super.preDestroy();
  }
}
