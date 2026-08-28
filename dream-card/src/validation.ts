import { getAssetEntry, resolveAssetUrl } from "./library";
import type { DreamCard, PlayerIssue } from "./types";

const supportedKinds = new Set(["narration", "dialogue", "action", "final-narration"]);
const specialSpeakers = new Set(["narrator", "stage"]);

export function inspectCard(card: DreamCard): PlayerIssue[] {
  const issues: PlayerIssue[] = [];
  if (card.schemaVersion !== "0.1.0") {
    issues.push({
      severity: "error",
      code: "card.schema-version",
      path: "$.schemaVersion",
      message: `播放器只支持 schemaVersion 0.1.0，当前值为 ${card.schemaVersion}。`
    });
  }
  if (card.data.acts.length < 5 || card.data.acts.length > 7) {
    issues.push({
      severity: "error",
      code: "acts.length",
      path: "$.data.acts",
      message: "幻梦卡必须包含 5 至 7 个 Act。"
    });
  }

  const placeholderAssets = new Set<string>();
  const missingAssets = new Set<string>();
  card.data.acts.forEach((act, actIndex) => {
    const instanceIds = new Set(act.characters.map((character) => character.instanceId));
    const offstageSpeakers = new Set<string>();
    const assetIds = [act.backgroundAssetId, ...act.characters.map((character) => character.assetId)];
    assetIds.forEach((assetId) => {
      const entry = getAssetEntry(assetId);
      if (!entry || !resolveAssetUrl(assetId)) missingAssets.add(assetId);
      else if (entry.status === "placeholder") placeholderAssets.add(assetId);
    });

    if (act.choices.length > 0) {
      issues.push({
        severity: "error",
        code: "act.choices-unsupported",
        path: `$.data.acts[${actIndex}].choices`,
        message: "播放器 0.1.0 尚不支持选择功能。"
      });
    }

    act.texts.forEach((text, textIndex) => {
      const kind = text.extensions?.sourceType ?? "narration";
      if (!supportedKinds.has(kind)) {
        issues.push({
          severity: "warning",
          code: "text.kind",
          path: `$.data.acts[${actIndex}].texts[${textIndex}]`,
          message: `未知文本类型 ${kind}，将按 narration 显示。`
        });
      }
      if (!specialSpeakers.has(text.speakerId) && !instanceIds.has(text.speakerId)) {
        offstageSpeakers.add(text.speakerId);
      }
    });

    if (offstageSpeakers.size > 0) {
      issues.push({
        severity: "warning",
        code: "text.offstage-speaker",
        path: `$.data.acts[${actIndex}].texts`,
        message: `本幕说话人 ${Array.from(offstageSpeakers).join("、")} 不在人物槽位中，将按画外对白播放。`
      });
    }
  });

  if (missingAssets.size > 0) {
    issues.push({
      severity: "warning",
      code: "asset.missing",
      path: "$.data.acts",
      message: `素材库缺少：${Array.from(missingAssets).join("、")}。`
    });
  }
  if (placeholderAssets.size > 0) {
    issues.push({
      severity: "warning",
      code: "asset.placeholder",
      path: "$.data.acts",
      message: `以下素材尚为占位版本：${Array.from(placeholderAssets).join("、")}。`
    });
  }
  return issues;
}
