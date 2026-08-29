import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { faceData } from "./data";

const expectedGeneratedViewRoots: Record<string, string> = {
  "gou-bu-pan-guan": "/dream-assets/codex/masks/gou-bu-pan-guan",
  "sao-di-he-shang": "/dream-assets/codex/masks/sao-di-he-shang",
  "liu-yi": "/dream-assets/codex/masks/liu-yi",
  "abu-mo": "/dream-assets/codex/masks/abu-mo"
};

describe("get-face mask view assets", () => {
  test.each(Object.entries(expectedGeneratedViewRoots))(
    "%s 使用独立侧面与背面素材",
    (maskId, root) => {
      const mask = faceData.masks.find((entry) => entry.id === maskId);

      expect(mask, `missing mask data for ${maskId}`).toBeDefined();
      expect(mask?.views.side).toBe(`${root}/side.png`);
      expect(mask?.views.back).toBe(`${root}/back.png`);
      expect(new Set([mask?.views.front, mask?.views.side, mask?.views.back]).size).toBe(3);
    }
  );

  test.each(Object.entries(expectedGeneratedViewRoots))(
    "%s 侧面与背面文件已落入 public",
    (maskId, root) => {
      for (const view of ["side", "back"] as const) {
        const publicPath = `${root}/${view}.png`;
        const filePath = join(process.cwd(), "public", publicPath.slice(1));
        expect(existsSync(filePath), `${maskId} missing ${publicPath}`).toBe(true);
      }
    }
  );
});
