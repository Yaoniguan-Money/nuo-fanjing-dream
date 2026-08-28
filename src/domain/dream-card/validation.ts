import { getAssetEntry, resolveAssetId } from "./assets";
import type { DreamCard } from "./schema";

export interface CardIssue {
  severity: "error" | "warning";
  code: string;
  path: string;
  message: string;
}

const supportedKinds = new Set(["narration", "dialogue", "action", "final-narration"]);
const specialSpeakers = new Set(["narrator", "stage"]);

export function inspectDreamCard(card: DreamCard): CardIssue[] {
  const issues: CardIssue[] = [];
  card.data.acts.forEach((act, actIndex) => {
    const instanceIds = new Set(act.characters.map((character) => character.instanceId));
    for (const assetId of [act.backgroundAssetId, ...act.characters.map((character) => character.assetId)]) {
      const entry = getAssetEntry(assetId);
      if (!entry || !resolveAssetId(assetId)) {
        issues.push({ severity: "error", code: "asset.missing", path: `$.data.acts[${actIndex}]`, message: `素材不存在：${assetId}` });
      }
    }
    act.texts.forEach((text, textIndex) => {
      const kind = text.extensions.sourceType ?? "narration";
      if (!supportedKinds.has(kind)) {
        issues.push({ severity: "warning", code: "text.kind", path: `$.data.acts[${actIndex}].texts[${textIndex}]`, message: `未知文本类型：${kind}` });
      }
      if (!specialSpeakers.has(text.speakerId) && !instanceIds.has(text.speakerId)) {
        issues.push({ severity: "warning", code: "text.offstage-speaker", path: `$.data.acts[${actIndex}].texts[${textIndex}]`, message: `画外说话人：${text.speakerId}` });
      }
    });
  });
  return issues;
}
