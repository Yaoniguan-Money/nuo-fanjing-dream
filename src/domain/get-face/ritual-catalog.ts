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
  "square-crown": "dream.xianfeng-xiaojie.qian-jie-qiao",
  "bound-hair": "dream.jiu-wei-tu-di-shen.di-jiu-tan",
  "high-crown": "dream.tangshi-taipo.zhi-hun-ji"
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

export const RITUAL_MASKS: readonly RitualMaskBinding[] = getFaceData.codex.slots.map((slot) => {
  const mask = getFaceData.masks.find((candidate) => candidate.id === slot.id);
  if (!mask) throw new Error(`傩谱槽位缺少面具：${slot.id}`);
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
