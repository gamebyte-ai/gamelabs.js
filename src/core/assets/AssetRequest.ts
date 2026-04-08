import type { AssetType } from "./AssetTypes.js";

export class AssetRequest {
  readonly type: AssetType;
  readonly id: string;
  readonly url: string;
  readonly content: unknown | null;

  constructor(type: AssetType, id: string, url: string, content?: unknown | null) {
    this.type = type;
    this.id = id;
    this.url = url;
    this.content = content ?? null;
  }
}
