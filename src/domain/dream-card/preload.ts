import { resolveAssetId } from "./assets";
import type { DreamAct, DreamCard } from "./schema";

function unique(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

export function getDreamActAssetUrls(act: DreamAct): string[] {
  return unique([
    resolveAssetId(act.backgroundAssetId),
    ...act.characters.map((character) => resolveAssetId(character.assetId))
  ]);
}

export function getDreamCardAssetUrls(card: DreamCard): string[] {
  return unique(card.data.acts.flatMap(getDreamActAssetUrls));
}
