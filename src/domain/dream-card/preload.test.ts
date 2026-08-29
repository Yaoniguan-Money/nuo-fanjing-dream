import { describe, expect, it } from "vitest";
import { requireDreamCard } from "./registry";
import { getDreamActAssetUrls, getDreamCardAssetUrls } from "./preload";

describe("dream card preload assets", () => {
  it("collects only assets referenced by the selected card", () => {
    const card = requireDreamCard("dream.kailu-jiangjun.du-shan-ji");
    const urls = getDreamCardAssetUrls(card);
    expect(urls.length).toBeGreaterThan(3);
    expect(urls.some((url) => url.includes("stone-sill-village"))).toBe(true);
    expect(urls.some((url) => url.includes("weaving-house"))).toBe(false);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("keeps first act preload smaller than the full story", () => {
    const card = requireDreamCard("dream.kailu-jiangjun.du-shan-ji");
    const firstAct = getDreamActAssetUrls(card.data.acts[0]);
    const fullStory = getDreamCardAssetUrls(card);
    expect(firstAct.length).toBeLessThan(fullStory.length);
    expect(firstAct.every((url) => fullStory.includes(url))).toBe(true);
  });
});
