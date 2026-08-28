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
  it("moves through name, wish, portrait, mask and three story choices", () => {
    let state = createInitialGetFaceRitualSession();
    state = transitionGetFaceRitual(state, { type: "nameSubmitted", name: "  阿渡  " });
    state = transitionGetFaceRitual(state, { type: "wishSubmitted", wish: "我想找到一条路" });
    expect(state.phase).toBe("portrait");
    state = transitionGetFaceRitual(state, { type: "portraitSkipped" });
    state = transitionGetFaceRitual(state, { type: "maskSelected", index: 0 });
    state = transitionGetFaceRitual(state, { type: "maskSnapped" });
    expect(state.phase).toBe("story");
    state = transitionGetFaceRitual(state, { type: "storyChoice", choice: 0 });
    state = transitionGetFaceRitual(state, { type: "storyChoice", choice: 1 });
    state = transitionGetFaceRitual(state, { type: "storyChoice", choice: 0 });
    expect(state.phase).toBe("submitting");
    expect(state.choices).toEqual([0, 1, 0]);
    expect(transitionGetFaceRitual(state, { type: "matched" }).phase).toBe("complete");
  });

  it("persists only the ritual draft and normalizes transient preview state", () => {
    const fakeStorage = storage();
    const state: GetFaceRitualSession = { ...createInitialGetFaceRitualSession(), phase: "portrait", name: "阿渡", wish: "找一条路", portraitMode: "preview" };
    writeGetFaceRitualSession(state, fakeStorage);
    const raw = [...fakeStorage.values.values()][0];
    expect(raw).not.toMatch(/camera|stream|video/i);
    expect(JSON.parse(raw).portraitMode).toBe("silhouette");
    expect(readGetFaceRitualSession(fakeStorage)).toEqual({ ...state, portraitMode: "silhouette" });
    expect(() => getFaceRitualSessionSchema.parse(JSON.parse(raw))).not.toThrow();
  });

  it("ignores invalid or out-of-order events", () => {
    const initial = createInitialGetFaceRitualSession();
    expect(transitionGetFaceRitual(initial, { type: "wishSubmitted", wish: "愿望" })).toEqual(initial);
    const named = transitionGetFaceRitual(initial, { type: "nameSubmitted", name: "" });
    expect(named).toEqual(initial);
  });
});
