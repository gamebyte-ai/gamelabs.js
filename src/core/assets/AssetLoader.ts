import * as THREE from "three";
import { Assets, Texture } from "pixi.js";
import { AssetTypes, type AssetType } from "./AssetTypes.js";
import { AssetRequest } from "./AssetRequest.js";
import type { ILogger } from "../dev/ILogger.js";
import { LogTypes } from "../dev/LogTypes.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

export class AssetLoader {
  private _logger: ILogger;
  private _defaultHudTexture: Texture | null = null;
  private _defaultGltf: GLTF | null = null;
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
      this.load(typeOrRequest.type, typeOrRequest.id, typeOrRequest.url);
      return;
    }

    const type = typeOrRequest;
    if (typeof id !== "string" || typeof url !== "string") {
      const msg = "AssetLoader.load: expected (type, id, url) or (request)";
      this._logger.log(msg, LogTypes.Error);
      throw new Error(msg);
    }

    if (this._assetsById.has(id)) return;

    const inflight = this._inflightById.get(id);
    if (inflight) return;

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
  }

  public getAsset<T>(id: string): T | undefined {
    return this._assetsById.get(id) as T | undefined;
  }

  private getDefaultHudTexture(): Texture {
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

  private getDefaultGltf(): GLTF {
    if (this._defaultGltf) return this._defaultGltf;
    const scene = new THREE.Group();
    scene.name = "GLTF_Fallback";
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x800080 });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    this._defaultGltf = {
      scene,
      scenes: [scene],
      animations: [],
      cameras: [],
      asset: { version: "2.0", generator: "Gamelab-Fallback" },
      parser: null as unknown as GLTF["parser"],
      userData: {}
    };
    return this._defaultGltf;
  }

  private loadByType(type: AssetType, url: string): Promise<unknown> {
    this._logger.log(`[AssetLoader] loading asset: type=${String(type)} url=${url}`);
    switch (type) {
      case AssetTypes.HudTexture:
        return Assets.load(url).catch((_err: unknown) => {
          this._logger.log(`[AssetLoader] HudTexture load failed: ${url}`, LogTypes.Warning);
          return this.getDefaultHudTexture();
        });
      case AssetTypes.GLTF:
        return this.loadGltf(url).catch((_err: unknown) => {
          this._logger.log(`[AssetLoader] GLTF load failed: ${url}`, LogTypes.Warning);
          return this.getDefaultGltf();
        });
      default: {
        const neverType: never = type;
        const msg = `AssetLoader: unsupported asset type: ${String(neverType)}`;
        this._logger.log(msg, LogTypes.Error);
        throw new Error(msg);
      }
    }
  }

  private async loadGltf(url: string): Promise<unknown> {
    const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
    const loader = new GLTFLoader();
    return loader.loadAsync(url);
  }
}

