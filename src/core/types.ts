import type { AssetManager } from "./assets/AssetManager.js";
import type { DevUtils } from "./dev/DevUtils.js";
import type { IHud } from "./hud/IHud.js";
import type { ILogger } from "./dev/ILogger.js";
import type { Logger } from "./dev/Logger.js";
import type { ViewportConfig } from "./utilities/computeViewportRect.js";
import type { IWorld } from "./world/IWorld.js";

export type WithCanvas = {
  /**
   * If omitted, the engine will create and manage a canvas.
   */
  canvas?: HTMLCanvasElement;
};

export type CreateWorldContext = {
  canvas: HTMLCanvasElement;
  mount: HTMLElement | undefined;
  logger: ILogger;
};

export type CreateHudContext = {
  mount: HTMLElement | undefined;
  logger: ILogger;
};

export type GamelabsAppConfig = WithCanvas & {
  /**
   * Optional mount element for measuring layout and/or attaching rendering layers.
   * If provided, `GamelabsApp` will use this element's bounding rect for resize measurements.
   */
  mount?: HTMLElement;

  /**
   * Optional size; if omitted and a canvas is provided, uses canvas client size.
   */
  width?: number;
  height?: number;

  /**
   * Optional viewport fit. Omitted ⇒ the canvases fill the mount (legacy behavior).
   * Set `{ fit: "contain", minAspect, maxAspect }` (or `aspectRatio`) to letterbox /
   * pillarbox a fixed-aspect (e.g. portrait) game so it never stretches to fill the window.
   */
  viewport?: ViewportConfig;

  /**
   * Optional factory that constructs the 3D World. If omitted, no World is
   * created and `app.world` stays `null` — the renderer-free path. The default
   * 3D entry (`@gamebyte/gamelabsjs`) injects `World.create` here so existing
   * consumers don't need to set this. A 2D/THREE-free entry (`/core`) leaves
   * it unset.
   */
  createWorld?: (ctx: CreateWorldContext) => Promise<IWorld>;

  /**
   * Optional factory that constructs the HUD. Defaults to `Hud.create` via
   * the standard entry; supplying a custom factory lets a test or a custom
   * Pixi setup inject its own `IHud` implementation.
   */
  createHud?: (ctx: CreateHudContext) => Promise<IHud>;

  /**
   * Optional factory that constructs the AssetManager. The 3D entry injects
   * a factory that returns `WorldAssetManager` (handles WorldTexture/GLTF);
   * a 2D entry leaves it unset and gets the base `AssetManager` (THREE-free).
   */
  createAssetManager?: (logger: ILogger) => AssetManager;

  /**
   * Optional factory that constructs the DevUtils. The 3D entry injects a
   * factory that returns `DevUtils3D` (adds GroundGrid); a 2D entry leaves it
   * unset and gets the base `DevUtils` (THREE-free, no ground grid).
   */
  createDevUtils?: (world: IWorld | null, hud: IHud, logger: Logger) => DevUtils;
};
