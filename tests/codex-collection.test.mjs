import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

function collectionContext() {
  const values = new Map();
  const window = { localStorage: { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) } };
  window.window = window;
  vm.runInNewContext(fs.readFileSync("src/codex-collection.js", "utf8"), { window, JSON, Date }, { filename: "src/codex-collection.js" });
  return { api: window.NuoCodexCollection, values };
}

const entry = (qian) => ({
  mask: { id: "crown-beard", name: "翘冠长须", asset: "assets/masks/mask-01.png", visual: {} },
  role: { id: "path-general", name: "开路将军", duty: "开障引路", signs: ["山纹"], background: "背景" },
  variant: { seed: 7 }, visualText: "视觉说明", reasonText: "授面理由", omen: { status: "ready", qian, jie: "傩解" }, sources: []
});

test("傩谱按面具 ID 更新且不写入愿望或人像", () => {
  const { api, values } = collectionContext();
  api.upsert("nuo.codex.v2", entry("前行莫问旧尘埃"));
  const first = api.get("nuo.codex.v2", "crown-beard");
  api.upsert("nuo.codex.v2", entry("路在灯下见分明"));
  const second = api.get("nuo.codex.v2", "crown-beard");
  assert.equal(Object.keys(api.list("nuo.codex.v2")).length, 1);
  assert.equal(second.omen.qian, "路在灯下见分明");
  assert.equal(first.collectedAt, second.collectedAt);
  assert.doesNotMatch(values.get("nuo.codex.v2"), /愿望|portrait|video|camera/i);
});

test("损坏的本地傩谱安全降级为空集合", () => {
  const { api, values } = collectionContext();
  values.set("nuo.codex.v2", "{not-json");
  assert.deepEqual(api.list("nuo.codex.v2"), {});
  assert.equal(api.clear("nuo.codex.v2"), true);
});
