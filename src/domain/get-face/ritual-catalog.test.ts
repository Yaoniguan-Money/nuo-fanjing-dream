import { describe, expect, it } from "vitest";
import { listDreamCardIds } from "../dream-card/registry";
import { getFaceData } from "./data";
import * as getFaceDomain from "./index";

interface RitualMaskBinding {
  storyId?: string;
  maskId: string;
  codexSlotId: string;
  name: string;
}

interface RitualCatalogApi {
  RITUAL_MASKS?: readonly RitualMaskBinding[];
  ritualMaskById?: (maskId: string) => RitualMaskBinding | null;
  ritualMaskByStoryId?: (storyId: string) => RitualMaskBinding | null;
  resolveRitualTarget?: (match: { cardId: string; maskId?: string }) =>
    | (RitualMaskBinding & { cardId: string })
    | null;
}

const catalog = getFaceDomain as RitualCatalogApi;

const expectedBindings = [
  ["dream.kailu-jiangjun.du-shan-ji", "crown-beard"],
  ["dream.xianfeng-xiaojie.yi-suo-hua", "square-crown"],
  ["dream.jiu-wei-tu-di-shen.di-jiu-tan", "bound-hair"],
  ["dream.tangshi-taipo.gui-zheng-ji", "high-crown"],
  ["dream.goubu-panguan.he-ye-ji", "gou-bu-pan-guan"],
  ["dream.saodi-heshang.yu-huo-ji", "sao-di-he-shang"],
  ["dream.liuyi.yi-xin-du-shui", "liu-yi"],
  ["dream.abumo.huang-nian-kai-huo", "abu-mo"]
] as const;

describe("eight-mask ritual catalog", () => {
  it("binds every current story to one mask and codex slot", () => {
    expect(catalog.RITUAL_MASKS).toBeDefined();
    expect(catalog.RITUAL_MASKS).toHaveLength(8);

    const bindings = catalog.RITUAL_MASKS ?? [];
    expect(bindings.map(({ storyId, maskId, codexSlotId }) => [storyId, maskId, codexSlotId])).toEqual(
      expectedBindings.map(([storyId, maskId]) => [storyId, maskId, maskId])
    );
    expect(new Set(bindings.map((item) => item.storyId)).size).toBe(8);
    expect(new Set(bindings.map((item) => item.maskId)).size).toBe(8);
    expect(new Set(bindings.map((item) => item.codexSlotId)).size).toBe(8);
    expect(bindings.map((item) => item.storyId).sort()).toEqual(listDreamCardIds().sort());
    expect(bindings.map((item) => item.maskId).sort()).toEqual(getFaceData.masks.map((mask) => mask.id).sort());
    expect(bindings.map((item) => item.codexSlotId).sort()).toEqual(getFaceData.codex.slots.map((slot) => slot.id).sort());
  });

  it.each(expectedBindings)("resolves %s to %s", (cardId, maskId) => {
    expect(catalog.resolveRitualTarget).toBeDefined();
    expect(catalog.resolveRitualTarget?.({ cardId })).toMatchObject({
      storyId: cardId,
      cardId,
      maskId,
      codexSlotId: maskId
    });
  });

  it("looks up catalog entries by mask id and current story id", () => {
    expect(catalog.ritualMaskById?.("liu-yi")).toMatchObject({
      maskId: "liu-yi",
      storyId: "dream.liuyi.yi-xin-du-shui"
    });
    expect(catalog.ritualMaskByStoryId?.("dream.liuyi.yi-xin-du-shui")).toMatchObject({
      maskId: "liu-yi",
      codexSlotId: "liu-yi"
    });
    expect(catalog.ritualMaskById?.("missing-mask")).toBeNull();
    expect(catalog.ritualMaskByStoryId?.("dream.missing.story")).toBeNull();
  });

  it("accepts a future story by mask id without changing the interaction layer", () => {
    expect(catalog.resolveRitualTarget?.({ maskId: "abu-mo", cardId: "dream.abumo.future-story" })).toMatchObject({
      maskId: "abu-mo",
      codexSlotId: "abu-mo",
      cardId: "dream.abumo.future-story",
      name: "阿布摩"
    });
  });
});
