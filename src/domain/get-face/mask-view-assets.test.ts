import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { faceData } from "./data";

const expectedGeneratedViews: Record<string, { front: string; generatedRoot: string }> = {
  "gou-bu-pan-guan": {
    front: "/dream-assets/ui/codex/details/gou-bu-pan-guan/main-mask.png",
    generatedRoot: "/dream-assets/codex/masks/gou-bu-pan-guan"
  },
  "sao-di-he-shang": {
    front: "/dream-assets/ui/codex/details/sao-di-he-shang/main-mask.png",
    generatedRoot: "/dream-assets/codex/masks/sao-di-he-shang"
  },
  "liu-yi": {
    front: "/dream-assets/ui/codex/details/liu-yi/main-mask.png",
    generatedRoot: "/dream-assets/codex/masks/liu-yi"
  },
  "abu-mo": {
    front: "/dream-assets/ui/codex/details/abu-mo/main-mask.png",
    generatedRoot: "/dream-assets/codex/masks/abu-mo"
  }
};

describe("get-face mask view assets", () => {
  test.each(Object.entries(expectedGeneratedViews))(
    "%s keeps the verified front and uses generated side and back assets",
    (maskId, expected) => {
      const mask = faceData.masks.find((entry) => entry.id === maskId);

      expect(mask, `missing mask data for ${maskId}`).toBeDefined();
      expect(mask?.views.front).toBe(expected.front);
      expect(mask?.views.side).toBe(`${expected.generatedRoot}/side.png`);
      expect(mask?.views.back).toBe(`${expected.generatedRoot}/back.png`);
    }
  );

  test.each(faceData.masks)("$name has three distinct existing view assets", (mask) => {
    const views = Object.values(mask.views);
    expect(new Set(views).size).toBe(3);

    for (const publicPath of views) {
      const filePath = join(process.cwd(), "public", publicPath.slice(1));
      expect(existsSync(filePath), `${mask.id} missing ${publicPath}`).toBe(true);
    }
  });
});
