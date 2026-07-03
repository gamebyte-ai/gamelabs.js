import { Assets, Texture } from "pixi.js";
import { AssetTypes, type AssetType } from "./AssetTypes.js";
import { AssetRequest } from "./AssetRequest.js";
import type { IAssetManager } from "./IAssetManager.js";
import type { ILogger } from "../dev/ILogger.js";
import { LogTypes } from "../dev/LogTypes.js";

export class AssetManager implements IAssetManager {
  private _logger: ILogger;
  private _defaultHudTexture: Texture | null = null;
  private readonly _assetsById = new Map<string, unknown>();
  private readonly _inflightById = new Map<string, Promise<unknown>>();
  private readonly _failedIds = new Set<string>();

  private _totalItems = 0;
  private _loadedItems = 0;

  public constructor(logger: ILogger) {
    this._logger = logger;
  }

  protected get logger(): ILogger {
    return this._logger;
  }

  public get totalItems(): number {
    return this._totalItems;
  }

  public get loadedItems(): number {
    return this._loadedItems;
  }

  public get failedIds(): ReadonlySet<string> {
    return this._failedIds;
  }

  public get hasFailures(): boolean {
    return this._failedIds.size > 0;
  }

  public isFallback(id: string): boolean {
    return this._failedIds.has(id);
  }

  public loadAll(requests: Iterable<AssetRequest>): void {
    for (const request of requests) {
      this.load(request);
    }
  }

  /**
   * Returns a promise that resolves when every currently in-flight load has settled.
   * Safe to call multiple times; resolves immediately if nothing is in-flight.
   */
  public async waitForAll(): Promise<void> {
    // Snapshot the current in-flight set.  New loads enqueued after this
    // call are NOT included (intentional — call again if needed).
    const pending = [...this._inflightById.values()];
    if (pending.length === 0) return;
    await Promise.all(pending);
  }

  public load(type: AssetType, id: string, url: string): void;
  public load(request: AssetRequest): void;
  public load(typeOrRequest: AssetType | AssetRequest, id?: string, url?: string): void {
    if (typeOrRequest instanceof AssetRequest) {
      const request = typeOrRequest;
      const hasUrl = typeof request.url === "string" && request.url.length > 0;

      if (hasUrl) {
        this.loadFromUrl(request.type, request.id, request.url);
      } else if (request.content != null) {
        this.loadFromContent(request.type, request.id, request.content);
      } else {
        this._logger.log(`[AssetManager] no url or content for id=${request.id}, using default`, LogTypes.Warning);
        this._assetsById.set(request.id, this.getDefaultForType(request.type));
      }
      return;
    }

    const type = typeOrRequest;
    if (typeof id !== "string" || typeof url !== "string") {
      const msg = "AssetLoader.load: expected (type, id, url) or (request)";
      this._logger.log(msg, LogTypes.Error);
      throw new Error(msg);
    }

    this.loadFromUrl(type, id, url);
  }

  private loadFromUrl(type: AssetType, id: string, url: string): void {
    if (this._assetsById.has(id)) return;
    if (this._inflightById.has(id)) return;

    this._totalItems += 1;

    const p = this.loadByType(type, url)
      .then((asset) => {
        this._assetsById.set(id, asset);
      })
      .catch((_err: unknown) => {
        this._logger.log(`[AssetManager] load failed: id=${id} url=${url}`, LogTypes.Warning);
        this._failedIds.add(id);
        this._assetsById.set(id, this.getDefaultForType(type));
      })
      .finally(() => {
        this._loadedItems += 1;
        this._inflightById.delete(id);
      });

    this._inflightById.set(id, p);
  }

  private loadFromContent(_type: AssetType, id: string, content: unknown): void {
    if (this._assetsById.has(id)) return;
    this._assetsById.set(id, content);
  }

  public getAsset<T>(id: string): T | undefined {
    return this._assetsById.get(id) as T | undefined;
  }

  public setAsset(id: string, asset: unknown): void {
    this._assetsById.set(id, asset);
  }

  /**
   * Lazy-built 1×1 magenta texture used as a fallback when a HUD asset
   * id can't be resolved (failed load) or when a caller needs a sprite
   * texture but the source style/opts don't carry a `textureId`. Public
   * because `StyledHudObject._buildStyledSprite` reaches for it from
   * the view layer.
   */
  public getDefaultHudTexture(): Texture {
    if (this._defaultHudTexture) return this._defaultHudTexture;
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#800080";
      ctx.fillRect(0, 0, 1, 1);
    }
    this._defaultHudTexture = Texture.from(canvas, true);
    return this._defaultHudTexture;
  }

  /**
   * Override point for renderer-specific (3D) asset defaults. The base
   * manager has no concept of `WorldTexture`/`GLTF`; a subclass that
   * bundles three.js (see `WorldAssetManager`) overrides this.
   */
  protected getDefaultWorldAsset(type: AssetType): unknown {
    throw new Error(`AssetManager: ${String(type)} requires a renderer-aware subclass (e.g. WorldAssetManager)`);
  }

  /**
   * Override point for renderer-specific (3D) asset loading. The base
   * manager has no concept of `WorldTexture`/`GLTF`; a subclass that
   * bundles three.js (see `WorldAssetManager`) overrides this.
   */
  protected loadWorldAsset(type: AssetType, _url: string): Promise<unknown> {
    return Promise.reject(new Error(`AssetManager: ${String(type)} requires a renderer-aware subclass (e.g. WorldAssetManager)`));
  }

  private getDefaultForType(type: AssetType): unknown {
    switch (type) {
      case AssetTypes.HudTexture:
        return this.getDefaultHudTexture();
      case AssetTypes.WorldTexture:
      case AssetTypes.GLTF:
        return this.getDefaultWorldAsset(type);
      case AssetTypes.Text:
        return "";
      case AssetTypes.Audio:
        return null;
      default: {
        const neverType: never = type;
        throw new Error(`AssetLoader: unsupported asset type: ${String(neverType)}`);
      }
    }
  }

  private loadByType(type: AssetType, url: string): Promise<unknown> {
    this._logger.log(`[AssetManager] loading asset: type=${String(type)} url=${url}`);
    switch (type) {
      case AssetTypes.HudTexture:
        return Assets.load(url);
      case AssetTypes.WorldTexture:
      case AssetTypes.GLTF:
        return this.loadWorldAsset(type, url);
      case AssetTypes.Text:
        return this.loadText(url);
      case AssetTypes.Audio:
        return this.loadAudio(url);
      default: {
        const neverType: never = type;
        const msg = `AssetManager: unsupported asset type: ${String(neverType)}`;
        this._logger.log(msg, LogTypes.Error);
        throw new Error(msg);
      }
    }
  }

  private async loadText(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch text: ${response.status} ${url}`);
    return response.text();
  }

  private async loadAudio(url: string): Promise<AudioBuffer> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch audio: ${response.status} ${url}`);
    const arrayBuffer = await response.arrayBuffer();
    const audioCtx = new (globalThis.AudioContext || globalThis.webkitAudioContext!)();
    const buffer = await audioCtx.decodeAudioData(arrayBuffer);
    audioCtx.close();
    return buffer;
  }
}
