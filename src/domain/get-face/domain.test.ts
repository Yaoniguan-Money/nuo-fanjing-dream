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

  test("图鉴数据收录已补全内容的柳毅", () => {
    expect(faceData.masks.some((mask) => mask.id === "liu-yi")).toBe(true);
    expect(faceData.roles.some((role) => role.id === "message-bearer")).toBe(true);
    expect(faceData.codex.slots.some((slot) => slot.id === "liu-yi")).toBe(true);
  });

  test("图鉴卡面只引用旧金线稿，不引用详情页优化面具", () => {
    expect(faceData.masks.find((mask) => mask.id === "gou-bu-pan-guan")?.artwork?.card).toBe("/dream-assets/ui/codex/fronts/gou-bu-pan-guan-v3.png");
    expect(faceData.masks.find((mask) => mask.id === "sao-di-he-shang")?.artwork?.card).toBe("/dream-assets/ui/codex/fronts/sao-di-he-shang-v6.png");
    expect(faceData.masks.find((mask) => mask.id === "abu-mo")?.artwork?.card).toBe("/dream-assets/ui/codex/fronts/abu-mo-v2.png");
    expect(faceData.masks.find((mask) => mask.id === "liu-yi")?.artwork?.card).toBe("/dream-assets/ui/codex/fronts/liu-yi-v2.png");
  });
});
