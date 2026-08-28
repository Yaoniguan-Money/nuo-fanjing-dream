import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const context = { window: {} };
context.window.window = context.window;
for (const filename of ["src/get-face-data.js", "src/get-face-domain.js"]) {
  vm.runInNewContext(fs.readFileSync(filename, "utf8"), context, { filename });
}
const { NuoGetFaceData: data, NuoGetFaceDomain: domain } = context.window;

test("前路主题授予开路类职司", () => {
  const visual = domain.resolveVisual(data, "我不知道前路该如何选择");
  const result = domain.resolveRole(data, { wish: "我不知道前路该如何选择", choices: [0, 1, 0], maskIndex: visual });
  assert.equal(result.role.id, "path-general");
  assert.equal(result.mask.id, "crown-beard");
});

test("未知愿望不随机伪装为既有职司", () => {
  const visual = domain.resolveVisual(data, "云朵落在没有名字的地方");
  const result = domain.resolveRole(data, { wish: "云朵落在没有名字的地方", choices: [1, 1, 1], maskIndex: visual });
  assert.equal(result.role.id, "neutral-questioner");
});

test("相同上下文产生相同视觉变体", () => {
  const role = data.roles.find((entry) => entry.id === "soul-returner");
  const contextInput = { name: "阿岚", wish: "我害怕失去自己", choices: [1, 0, 0] };
  assert.deepEqual(domain.buildVariant(data, contextInput, role), domain.buildVariant(data, contextInput, role));
});
