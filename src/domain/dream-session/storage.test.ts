import { describe, expect, it } from "vitest";
import { createDreamSession } from "./schema";
import { clearDreamSession, readDreamSession, writeDreamSession } from "./storage";

function storage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); }
  };
}

describe("dream session storage boundary", () => {
  it("clears the transient dream session without touching another storage", () => {
    const sessionStorage = storage();
    const localStorage = storage();
    writeDreamSession(createDreamSession("我想找到一条路", { schemaVersion: "1.0.0", cardId: "dream.kailu-jiangjun.du-shan-ji", provider: "deterministic-local", confidence: .8, reason: "fixture" }), sessionStorage);
    localStorage.setItem("nuo.codex.v2", "keep");

    expect(readDreamSession(sessionStorage)).not.toBeNull();
    clearDreamSession(sessionStorage);
    expect(readDreamSession(sessionStorage)).toBeNull();
    expect(localStorage.getItem("nuo.codex.v2")).toBe("keep");
  });
});
