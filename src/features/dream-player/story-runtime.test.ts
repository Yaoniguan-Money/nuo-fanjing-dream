import { describe, expect, it } from "vitest";
import { readDreamSession } from "@/domain/dream-session/storage";
import { readGetFaceRitualSession } from "@/domain/get-face/session";
import { completeStoryRuntime, ensureStoryRuntime } from "./story-runtime";

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); }
  };
}

describe("direct story runtime", () => {
  it.each([
    ["dream.kailu-jiangjun.du-shan-ji", "crown-beard"],
    ["dream.xianfeng-xiaojie.qian-jie-qiao", "square-crown"],
    ["dream.jiu-wei-tu-di-shen.di-jiu-tan", "bound-hair"],
    ["dream.tangshi-taipo.zhi-hun-ji", "high-crown"]
  ])("binds %s to its own mask", (cardId, maskId) => {
    const dreamStorage = storage();
    const ritualStorage = storage();

    ensureStoryRuntime(cardId, dreamStorage, ritualStorage);
    completeStoryRuntime(cardId, dreamStorage, ritualStorage);

    expect(readDreamSession(dreamStorage)?.match).toMatchObject({ cardId, maskId });
    expect(readGetFaceRitualSession(ritualStorage)).toMatchObject({ phase: "complete", cardId, selectedMaskId: maskId });
  });

  it("replaces a stale land-god session when another story is selected", () => {
    const dreamStorage = storage();
    const ritualStorage = storage();
    ensureStoryRuntime("dream.jiu-wei-tu-di-shen.di-jiu-tan", dreamStorage, ritualStorage);
    ensureStoryRuntime("dream.xianfeng-xiaojie.qian-jie-qiao", dreamStorage, ritualStorage);

    expect(readDreamSession(dreamStorage)?.match.maskId).toBe("square-crown");
    expect(readGetFaceRitualSession(ritualStorage)?.selectedMaskId).toBe("square-crown");
  });
});
