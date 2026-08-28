import { describe, expect, test } from "vitest";
import { faceData, buildVariant, chineseCount, resolveRole, resolveVisual } from "./index";

describe("get-face domain", () => {
  test("前路主题授予开路类职司", () => {
    const wish = "我不知道前路该如何选择";
    const visual = resolveVisual(faceData, wish);
    const result = resolveRole(faceData, { wish, choices: [0, 1, 0], maskIndex: visual });
    expect(result.role.id).toBe("path-general");
    expect(result.mask.id).toBe("crown-beard");
  });

  test("未知愿望不随机伪装为既有职司", () => {
    const wish = "云朵落在没有名字的地方";
    const visual = resolveVisual(faceData, wish);
    const result = resolveRole(faceData, { wish, choices: [1, 1, 1], maskIndex: visual });
    expect(result.role.id).toBe("neutral-questioner");
  });

  test("相同上下文产生相同视觉变体，并统计中文字符", () => {
    const role = faceData.roles.find((entry) => entry.id === "soul-returner");
    if (!role) throw new Error("fixture role missing");
    const context = { name: "阿岚", wish: "我害怕失去自己", choices: [1, 0, 0] };
    expect(buildVariant(faceData, context, role)).toEqual(buildVariant(faceData, context, role));
    expect(chineseCount("阿岚 hello")).toBe(2);
  });
});
