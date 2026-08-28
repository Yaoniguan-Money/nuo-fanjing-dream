import { describe, expect, test } from "vitest";
import { createCodexCollection, type StorageLike } from "./index";

function memoryStorage(): StorageLike & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); }
  };
}

const entry = (qian: string) => ({
  mask: { id: "crown-beard", name: "翘冠长须", asset: "assets/masks/mask-01.png", visual: {} },
  role: { id: "path-general", name: "开路将军", duty: "开障引路", signs: ["山纹"], background: "背景" },
  variant: { seed: 7, wish: "不应写入", portrait: { data: "不应写入" }, media: "不应写入", apiConfig: { token: "不应写入" } },
  visualText: "视觉说明", reasonText: "授面理由", omen: { status: "ready", qian, jie: "傩解" }, sources: []
});

describe("codex collection", () => {
  test("傩谱按面具 ID 更新且不写入愿望、人像、媒体或 API 配置", () => {
    const storage = memoryStorage();
    const api = createCodexCollection(storage);
    api.upsert("nuo.codex.v2", entry("前行莫问旧尘埃"));
    const first = api.get("nuo.codex.v2", "crown-beard");
    api.upsert("nuo.codex.v2", entry("路在灯下见分明"));
    const second = api.get("nuo.codex.v2", "crown-beard");
    expect(Object.keys(api.list("nuo.codex.v2"))).toHaveLength(1);
    expect(second?.omen.qian).toBe("路在灯下见分明");
    expect(first?.collectedAt).toBe(second?.collectedAt);
    expect(storage.values.get("nuo.codex.v2")).not.toMatch(/wish|portrait|media|apiConfig|camera|video/i);
  });

  test("损坏的本地傩谱安全降级为空集合", () => {
    const storage = memoryStorage();
    const api = createCodexCollection(storage);
    storage.values.set("nuo.codex.v2", "{not-json");
    expect(api.list("nuo.codex.v2")).toEqual({});
    expect(api.clear("nuo.codex.v2")).toBe(true);
  });

  test("损坏条目被丢弃，读取也不会把未允许字段透传", () => {
    const storage = memoryStorage();
    const api = createCodexCollection(storage);
    storage.values.set("nuo.codex.v2", JSON.stringify({ version: 2, entries: { "crown-beard": { ...entry("qian"), wish: "secret" } } }));
    const saved = api.get("nuo.codex.v2", "crown-beard");
    expect(saved).not.toBeNull();
    expect(saved).not.toHaveProperty("wish");
    expect(JSON.stringify(saved)).not.toContain("secret");
  });
});
