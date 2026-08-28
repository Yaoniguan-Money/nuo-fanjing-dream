import manifestJson from "../../../content/assets.manifest.json";
import { assetManifestSchema, type AssetEntry } from "./schema";

export const assetManifest = assetManifestSchema.parse(manifestJson);

const assetsById = new Map(assetManifest.assets.map((asset) => [asset.assetId, asset]));

export function getAssetEntry(assetId: string): AssetEntry | null {
  return assetsById.get(assetId) ?? null;
}

export function resolveAssetId(assetId: string): string | null {
  const entry = getAssetEntry(assetId);
  if (!entry) return null;
  const encodedPath = entry.file.split("/").map(encodeURIComponent).join("/");
  return `/dream-assets/${encodedPath}`;
}

export function listAssets(): AssetEntry[] {
  return [...assetManifest.assets];
}
