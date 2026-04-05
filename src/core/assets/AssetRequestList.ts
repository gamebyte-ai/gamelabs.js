import { AssetRequest } from "./AssetRequest.js";
import { IAssetRequestList } from "./IAssetRequestList.js";


export class AssetRequestList implements IAssetRequestList {
    //  FIELDS
    private readonly _assets: Map<string, AssetRequest> = new Map();

    //  METHODS
    public addRequest(request: AssetRequest): void {
        this._assets.set(request.id, request);
    }

    public overrideRequest(id: string, url: string, content?: unknown | null): void {
        const request = this._assets.get(id);
        if (!request) return;
        this._assets.set(id, new AssetRequest(request.type, id, url, content));
    }

  public getRequest(id: string): AssetRequest | undefined {
    return this._assets.get(id);
  }

  public getRequests(): Iterable<AssetRequest> {
    return this._assets.values();
  }
}
