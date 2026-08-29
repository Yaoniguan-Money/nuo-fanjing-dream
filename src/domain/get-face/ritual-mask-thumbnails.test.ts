import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { RITUAL_MASK_THUMBNAILS } from "./ritual-mask-thumbnails";

describe("ritual mask thumbnails", () => {
  it("keeps the pre-dream mask orbit on small non-codex-detail assets", () => {
    expect(RITUAL_MASK_THUMBNAILS).toHaveLength(8);
    for (const url of RITUAL_MASK_THUMBNAILS) {
      expect(url).toMatch(/^\/dream-assets\/ui\/ritual\/masks\/.+\.png$/);
      expect(url).not.toContain("/ui/codex/details/");
      const file = join(process.cwd(), "public", url);
      expect(existsSync(file)).toBe(true);
      expect(statSync(file).size).toBeLessThanOrEqual(30_000);
    }
  });
});
