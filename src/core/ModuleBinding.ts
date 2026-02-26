import { ViewFactory } from "./views/ViewFactory.js";
import { DIContainer } from "./di/DIContainer.js";
import type { IInstanceResolver } from "./di/IInstanceResolver.js";
import { AssetRequest } from "./assets/AssetRequest.js";

export class ModuleBinding {
  protected readonly _assets: Map<string, AssetRequest> = new Map();

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public configureDI(diContainer: DIContainer): void{}
  
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public configureViews(viewFactory: ViewFactory<IInstanceResolver>): void{}
  
  public overrideAssetUrl(id: string, url: string): void {
    const request = this._assets.get(id);
    if (!request) return;
    this._assets.set(id, new AssetRequest(request.type, id, url));
  }

  public getAssetRequests(): Iterable<AssetRequest> {
    return this._assets.values();
  }
}
