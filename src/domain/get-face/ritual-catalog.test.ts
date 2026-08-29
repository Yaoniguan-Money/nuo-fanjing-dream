import { describe, expect, it } from "vitest";
import { getFaceData } from "./data";
import { RITUAL_MASKS, resolveRitualTarget } from "./ritual-catalog";

describe("eight-mask ritual catalog", () => {
  it("defines one unique ritual and codex target for every configured mask", () => {
    expect(RITUAL_MASKS).toHaveLength(8);
    expect(new Set(RITUAL_MASKS.map((item) => item.maskId)).size).toBe(8);
    expect(new Set(RITUAL_MASKS.map((item) => item.codexSlotId)).size).toBe(8);
    expect(RITUAL_MASKS.map((item) => item.maskId).sort()).toEqual(getFaceData.masks.map((mask) => mask.id).sort());
    expect(RITUAL_MASKS.map((item) => item.codexSlotId).sort()).toEqual(getFaceData.codex.slots.map((slot) => slot.id).sort());
  });

  it("accepts a future story by mask id without changing the interaction layer", () => {
    expect(resolveRitualTarget({ maskId: "abu-mo", cardId: "dream.abu-mo.future-story" })).toMatchObject({
      maskId: "abu-mo",
      cardId: "dream.abu-mo.future-story",
      name: "阿布摩"
    });
  });

  it("keeps legacy four-story responses mapped to the authoritative mask", () => {
    expect(resolveRitualTarget({ cardId: "dream.kailu-jiangjun.du-shan-ji" })).toMatchObject({
      maskId: "crown-beard",
      name: "开路将军"
    });
  });

  it("uses the verified transparent hero mask as each ritual front", () => {
    const landMask = getFaceData.masks.find((mask) => mask.id === "bound-hair");
    expect(landMask?.views.front).toBe("/dream-assets/ui/codex/details/yabing-tudi/main-mask.png");
  });
});
