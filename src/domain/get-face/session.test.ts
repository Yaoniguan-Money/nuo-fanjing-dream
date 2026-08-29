import { describe, expect, it } from "vitest";
import {
  createInitialGetFaceRitualSession,
  getFaceRitualSessionSchema,
  readGetFaceRitualSession,
  transitionGetFaceRitual,
  writeGetFaceRitualSession,
  type GetFaceRitualSession
} from "./session";

function storage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); }
  };
}

describe("get-face ritual session", () => {
  it("moves through name, wish, matching, reveal and wearing without portrait or story choices", () => {
    let state = createInitialGetFaceRitualSession();
    state = transitionGetFaceRitual(state, { type: "nameSubmitted", name: "  阿渡  " });
    state = transitionGetFaceRitual(state, { type: "wishSubmitted", wish: "我想找到一条路" });
    expect(state.phase).toBe("matching");
    state = transitionGetFaceRitual(state, { type: "matchResolved", cardId: "dream.kailu-jiangjun.du-shan-ji", maskId: "crown-beard" });
    expect(state).toMatchObject({ phase: "mask", selectedMaskId: "crown-beard", cardId: "dream.kailu-jiangjun.du-shan-ji" });
    state = transitionGetFaceRitual(state, { type: "enterStory" });
    expect(state.phase).toBe("wearing");
    expect(transitionGetFaceRitual(state, { type: "wearComplete" }).phase).toBe("complete");
  });

  it("persists only the ritual draft without camera or choice state", () => {
    const fakeStorage = storage();
    const state: GetFaceRitualSession = { ...createInitialGetFaceRitualSession(), phase: "mask", name: "阿渡", wish: "找一条路", selectedMaskIndex: 0, cardId: "dream.kailu-jiangjun.du-shan-ji" };
    writeGetFaceRitualSession(state, fakeStorage);
    const raw = [...fakeStorage.values.values()][0];
    expect(raw).not.toMatch(/camera|stream|video|portrait|choices|storyIndex/i);
    expect(readGetFaceRitualSession(fakeStorage)).toEqual(state);
    expect(() => getFaceRitualSessionSchema.parse(JSON.parse(raw))).not.toThrow();
  });

  it("keeps the complete whitelist for the result page while excluding camera state", () => {
    const fakeStorage = storage();
    const complete: GetFaceRitualSession = {
      ...createInitialGetFaceRitualSession(),
      phase: "complete",
      name: "阿渡",
      wish: "找一条路",
      selectedMaskIndex: 0,
      cardId: "dream.kailu-jiangjun.du-shan-ji"
    };
    writeGetFaceRitualSession(complete, fakeStorage);
    expect(readGetFaceRitualSession(fakeStorage)).toEqual(complete);
    expect([...fakeStorage.values.values()][0]).not.toMatch(/camera|stream|video|portrait|choices/i);
  });

  it("ignores invalid or out-of-order events", () => {
    const initial = createInitialGetFaceRitualSession();
    expect(transitionGetFaceRitual(initial, { type: "wishSubmitted", wish: "愿望" })).toEqual(initial);
    const named = transitionGetFaceRitual(initial, { type: "nameSubmitted", name: "" });
    expect(named).toEqual(initial);
  });

  it("accepts any of the eight configured masks without a four-mask index limit", () => {
    let state = createInitialGetFaceRitualSession();
    state = transitionGetFaceRitual(state, { type: "nameSubmitted", name: "阿渡" });
    state = transitionGetFaceRitual(state, { type: "wishSubmitted", wish: "我想把未来留下" });
    state = transitionGetFaceRitual(state, { type: "matchResolved", cardId: "dream.abu-mo.future-story", maskId: "abu-mo" });
    expect(state).toMatchObject({ phase: "mask", selectedMaskId: "abu-mo", cardId: "dream.abu-mo.future-story" });
  });
});
