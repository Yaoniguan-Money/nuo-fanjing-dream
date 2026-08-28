import assetManifestJson from "../assets/assets.manifest.json";
import type { AssetEntry, AssetManifest, CardOption, DreamCard } from "./types";

const cardModules = import.meta.glob("../cards/*.json", {
  eager: true,
  import: "default"
}) as Record<string, DreamCard>;

const assetModules = import.meta.glob(
  [
    "../assets/**/*.{png,webp,jpg,jpeg,gif,svg,mp3,wav,ogg}",
    "!../assets/source/**"
  ],
  {
    eager: true,
    import: "default",
    query: "?url"
  }
) as Record<string, string>;

export const assetManifest = assetManifestJson as AssetManifest;

export const cardOptions: CardOption[] = Object.entries(cardModules)
  .map(([modulePath, card]) => ({ modulePath, card }))
  .sort((left, right) => left.card.meta.title.localeCompare(right.card.meta.title, "zh-CN"));

const assetEntryById = new Map<string, AssetEntry>(
  assetManifest.assets.map((entry) => [entry.assetId, entry])
);

const assetUrlById = new Map<string, string>();
for (const entry of assetManifest.assets) {
  const modulePath = `../assets/${entry.file}`;
  const url = assetModules[modulePath];
  if (url) assetUrlById.set(entry.assetId, url);
}

export function resolveAssetUrl(assetId: string): string | null {
  return assetUrlById.get(assetId) ?? null;
}

export function getAssetEntry(assetId: string): AssetEntry | null {
  return assetEntryById.get(assetId) ?? null;
}
