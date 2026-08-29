import { describe, expect, it } from "vitest";
import { getCodexPreloadUrlsForCard } from "./assets";

describe("codex preload assets", () => {
  it("returns only the matched office detail assets, including shared catalogue files", () => {
    const urls = getCodexPreloadUrlsForCard("dream.kailu-jiangjun.du-shan-ji");
    expect(urls.some((url) => url.includes("details/kailu-jiangjun/main-mask"))).toBe(true);
    expect(urls.some((url) => url.includes("related/shared/lingqi.png"))).toBe(true);
    expect(urls.some((url) => url.includes("details/abu-mo/main-mask"))).toBe(false);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("does not return catalogue assets for an unknown card", () => {
    expect(getCodexPreloadUrlsForCard("dream.unknown")).toEqual([]);
  });
});
