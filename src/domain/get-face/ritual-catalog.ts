import { getFaceData } from "./data";

export interface RitualMaskBinding {
  maskId: string;
  codexSlotId: string;
  name: string;
  duty: string;
  storyId?: string;
}

const CURRENT_STORIES: Record<string, string> = {
  "crown-beard": "dream.kailu-jiangjun.du-shan-ji",
  "square-crown": "dream.xianfeng-xiaojie.yi-suo-hua",
  "bound-hair": "dream.jiu-wei-tu-di-shen.di-jiu-tan",
  "high-crown": "dream.tangshi-taipo.gui-zheng-ji",
  "gou-bu-pan-guan": "dream.goubu-panguan.he-ye-ji",
  "sao-di-he-shang": "dream.saodi-heshang.yu-huo-ji",
  "liu-yi": "dream.liuyi.yi-xin-du-shui",
  "abu-mo": "dream.abumo.huang-nian-kai-huo"
};

const DUTIES: Record<string, string> = {
  "crown-beard": "开障引路",
  "square-crown": "承愿守界",
  "bound-hair": "持衡安位",
  "high-crown": "守界重建",
  "gou-bu-pan-guan": "归档旧事",
  "sao-di-he-shang": "扫尽余响",
  "liu-yi": "倾听传声",
  "abu-mo": "荒年留种"
};

export const RITUAL_MASKS: readonly RitualMaskBinding[] = getFaceData.masks.map((mask) => {
  const slot = getFaceData.codex.slots.find((candidate) => candidate.id === mask.id);
  if (!slot) throw new Error(`傩谱面具缺少图鉴槽位：${mask.id}`);
  return {
    maskId: mask.id,
    codexSlotId: slot.id,
    name: mask.name,
    duty: DUTIES[mask.id] ?? "候坛守职",
    storyId: CURRENT_STORIES[mask.id]
  };
});

const byMaskId = new Map(RITUAL_MASKS.map((item) => [item.maskId, item]));
const byStoryId = new Map(RITUAL_MASKS.filter((item) => item.storyId).map((item) => [item.storyId!, item]));

export function ritualMaskById(maskId: string): RitualMaskBinding | null {
  return byMaskId.get(maskId) ?? null;
}

export function ritualMaskByStoryId(storyId: string): RitualMaskBinding | null {
  return byStoryId.get(storyId) ?? null;
}

export function resolveRitualTarget(match: { cardId: string; maskId?: string }): (RitualMaskBinding & { cardId: string }) | null {
  const binding = (match.maskId ? byMaskId.get(match.maskId) : null) ?? byStoryId.get(match.cardId) ?? null;
  return binding ? { ...binding, cardId: match.cardId } : null;
}
