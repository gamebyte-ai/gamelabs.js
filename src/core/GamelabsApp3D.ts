import { GamelabsApp as GamelabsAppBase } from "./GamelabsApp.js";
import type { CreateWorldContext, GamelabsAppConfig } from "./types.js";
import { WorldAssetManager } from "./assets/WorldAssetManager.js";
import { DevUtils3D } from "./dev/DevUtils3D.js";
import { World } from "./world/World.js";
import type { IWorld } from "./world/IWorld.js";

/**
 * 3D-by-default GamelabsApp. Injects the standard three.js factories
 * (`World.create`, `WorldAssetManager`, `DevUtils3D`) so existing consumers
 * import `GamelabsApp` from `@gamebyte/gamelabsjs` and get the same behavior
 * as before. A renderer-free build imports the base `GamelabsApp` from
 * `@gamebyte/gamelabsjs/core` and provides its own factories (or none).
 */
export class GamelabsApp extends GamelabsAppBase {
  /**
   * Narrows the inherited `world` field to the concrete `World` class.
   * The 3D entry always constructs a `World` via its default `createWorld`
   * factory, so subclasses extending this entry's `GamelabsApp` get access to
   * three.js-specific members (`scene`, `activeCamera`, `setActiveCamera`,
   * …) without casts.
   */
  protected override world: World | null = null;

  public constructor(config: GamelabsAppConfig) {
    super({
      ...config,
      createWorld: config.createWorld ?? GamelabsApp._defaultCreateWorld,
      createAssetManager: config.createAssetManager ?? ((logger) => new WorldAssetManager(logger)),
      createDevUtils:
        config.createDevUtils ??
        ((world, hud, logger) => {
          if (!world) throw new Error("GamelabsApp (3D): DevUtils3D requires a World");
          return new DevUtils3D(world as World, hud as never, logger);
        }),
    });
  }

  private static _defaultCreateWorld = async (ctx: CreateWorldContext): Promise<IWorld> => {
    if (!ctx.mount) throw new Error("GamelabsApp (3D): missing mount element");
    return World.create(ctx.canvas, {
      mount: ctx.mount,
      canvasClassName: "layer world3d",
      logger: ctx.logger,
    });
  };
}
