// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { NEXT_RITUAL_STAGE_URLS, normalizePreloadUrls } from "./resource-preloader";

describe("resource preloader", () => {
  it("deduplicates runtime asset urls and ignores non-dream paths", () => {
    expect(normalizePreloadUrls(["/dream-assets/a.png", "/api/other", "/dream-assets/a.png", "https://example.com/a.png"])).toEqual(["/dream-assets/a.png"]);
  });

  it("keeps the next ritual preload set free of codex detail assets", () => {
    expect(NEXT_RITUAL_STAGE_URLS.every((url) => !url.includes("/ui/codex/"))).toBe(true);
  });
});
