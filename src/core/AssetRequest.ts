import type { AssetType } from "./AssetTypes.js";

export class AssetRequest {
  readonly type: AssetType;
  readonly id: string;
  readonly url: string;

  constructor(type: AssetType, id: string, url: string) {
    this.type = type;
    this.id = id;
    this.url = url;
  }
}

