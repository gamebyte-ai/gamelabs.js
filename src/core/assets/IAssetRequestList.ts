import type { AssetRequest } from "./AssetRequest.js";

export interface IAssetRequestList {
    getRequests(): Iterable<AssetRequest>;
}
