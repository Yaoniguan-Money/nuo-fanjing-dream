// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { RITUAL_MASK_THUMBNAILS } from "@/domain/get-face/ritual-mask-thumbnails";
import { NEXT_RITUAL_STAGE_URLS, normalizePreloadUrls } from "./resource-preloader";

describe("resource preloader", () => {
  it("deduplicates runtime asset urls and ignores non-dream paths", () => {
    expect(normalizePreloadUrls(["/dream-assets/a.png", "/api/other", "/dream-assets/a.png", "https://example.com/a.png"])).toEqual(["/dream-assets/a.png"]);
  });

  it("keeps the next ritual preload set free of codex detail assets", () => {
    expect(NEXT_RITUAL_STAGE_URLS.every((url) => !url.includes("/ui/codex/"))).toBe(true);
  });

  it("keeps all eight ritual thumbnails in the required staged preload", () => {
    expect(RITUAL_MASK_THUMBNAILS).toHaveLength(8);
    expect(NEXT_RITUAL_STAGE_URLS).toEqual(expect.arrayContaining([...RITUAL_MASK_THUMBNAILS]));
  });
});
