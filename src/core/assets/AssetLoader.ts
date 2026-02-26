import { Assets } from "pixi.js";
import { AssetTypes, type AssetType } from "./AssetTypes.js";
import { AssetRequest } from "./AssetRequest.js";
import type { ILogger } from "../dev/ILogger.js";

export class AssetLoader {
  private _logger: ILogger;
  private readonly _assetsById = new Map<string, unknown>();
  private readonly _inflightById = new Map<string, Promise<unknown>>();

  private _totalItems = 0;
  private _loadedItems = 0;

  public constructor(logger: ILogger) {
    this._logger = logger;
  }

  public get totalItems(): number {
    return this._totalItems;
  }

  public get loadedItems(): number {
    return this._loadedItems;
  }

  public loadAll(requests: Iterable<AssetRequest> ): void{
    for (const request of requests) {
      this.load(request);
    }
  }

  public load(type: AssetType, id: string, url: string): Promise<void>;
  public load(request: AssetRequest): Promise<void>;
  public load(typeOrRequest: AssetType | AssetRequest, id?: string, url?: string): Promise<void> {
    if (typeOrRequest instanceof AssetRequest) {
      return this.load(typeOrRequest.type, typeOrRequest.id, typeOrRequest.url);
    }

    const type = typeOrRequest;
    if (typeof id !== "string" || typeof url !== "string") {
      throw new Error("AssetLoader.load: expected (type, id, url) or (request)");
    }

    if (this._assetsById.has(id)) return Promise.resolve();

    const inflight = this._inflightById.get(id);
    if (inflight) return inflight.then(() => undefined);

    this._totalItems += 1;

    const p = this.loadByType(type, url)
      .then((asset) => {
        this._assetsById.set(id, asset);
      })
      .finally(() => {
        this._loadedItems += 1;
        this._inflightById.delete(id);
      });

    this._inflightById.set(id, p);
    return p;
  }

  public getAsset<T>(id: string): T | undefined {
    return this._assetsById.get(id) as T | undefined;
  }

  private loadByType(type: AssetType, url: string): Promise<unknown> {
    this._logger.log(`[AssetLoader] loading asset: type=${String(type)} url=${url}`);
    switch (type) {
      case AssetTypes.HudTexture:
        return Assets.load(url);
      case AssetTypes.GLTF:
        return this.loadGltf(url);
      default: {
        const neverType: never = type;
        throw new Error(`AssetLoader: unsupported asset type: ${String(neverType)}`);
      }
    }
  }

  private async loadGltf(url: string): Promise<unknown> {
    const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
    const loader = new GLTFLoader();
    return loader.loadAsync(url);
  }
}

