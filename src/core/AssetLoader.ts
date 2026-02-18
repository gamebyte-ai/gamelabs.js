import { Assets } from "pixi.js";
import { AssetTypes, type AssetType } from "./AssetTypes.js";
import { AssetRequest } from "./AssetRequest.js";

export class AssetLoader {
  private readonly assetsById = new Map<string, unknown>();
  private readonly inflightById = new Map<string, Promise<unknown>>();

  private _totalItems = 0;
  private _loadedItems = 0;

  get totalItems(): number {
    return this._totalItems;
  }

  get loadedItems(): number {
    return this._loadedItems;
  }

  load(type: AssetType, id: string, url: string): Promise<void>;
  load(request: AssetRequest): Promise<void>;
  load(typeOrRequest: AssetType | AssetRequest, id?: string, url?: string): Promise<void> {
    if (typeOrRequest instanceof AssetRequest) {
      return this.load(typeOrRequest.type, typeOrRequest.id, typeOrRequest.url);
    }

    const type = typeOrRequest;
    if (typeof id !== "string" || typeof url !== "string") {
      throw new Error("AssetLoader.load: expected (type, id, url) or (request)");
    }

    if (this.assetsById.has(id)) return Promise.resolve();

    const inflight = this.inflightById.get(id);
    if (inflight) return inflight.then(() => undefined);

    this._totalItems += 1;

    const p = this.loadByType(type, url)
      .then((asset) => {
        this.assetsById.set(id, asset);
      })
      .finally(() => {
        this._loadedItems += 1;
        this.inflightById.delete(id);
      });

    this.inflightById.set(id, p);
    return p;
  }

  getAsset<T>(id: string): T | undefined {
    return this.assetsById.get(id) as T | undefined;
  }

  private loadByType(type: AssetType, url: string): Promise<unknown> {
    switch (type) {
      case AssetTypes.HudTexture:
        return Assets.load(url);
      default: {
        const neverType: never = type;
        throw new Error(`AssetLoader: unsupported asset type: ${String(neverType)}`);
      }
    }
  }
}
