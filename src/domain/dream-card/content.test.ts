import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import Ajv2020 from "ajv/dist/2020";
import dreamCardJsonSchema from "../../../docs/dream-card/dream-card.schema.json";
import { advancePlayback, initialPlaybackState } from "./playback";
import { listAssets, resolveAssetId } from "./assets";
import { listDreamCards } from "./registry";
import { inspectDreamCard } from "./validation";

describe("DreamCard content contract", () => {
  it("parses every registered card and preserves the complete seven-act story", () => {
    const cards = listDreamCards();
    const validateJsonSchema = new Ajv2020({ allErrors: true }).compile(dreamCardJsonSchema);
    expect(cards).toHaveLength(1);
    expect(cards[0].data.acts).toHaveLength(7);
    for (const card of cards) expect(validateJsonSchema(card), JSON.stringify(validateJsonSchema.errors)).toBe(true);
    expect(inspectDreamCard(cards[0]).filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("resolves every manifest asset to a real public file", () => {
    const assets = listAssets();
    expect(new Set(assets.map((asset) => asset.assetId)).size).toBe(assets.length);
    for (const asset of assets) {
      const url = resolveAssetId(asset.assetId);
      expect(url).toBe(`/dream-assets/${asset.file}`);
      expect(existsSync(join(process.cwd(), "public", url!))).toBe(true);
    }
  });

  it("can advance deterministically through every line to completion", () => {
    const card = listDreamCards()[0];
    let playback = initialPlaybackState;
    for (let step = 0; step < 200 && playback.phase !== "finished"; step += 1) {
      playback = advancePlayback(card, playback);
    }
    expect(playback.phase).toBe("finished");
    expect(playback.actIndex).toBe(6);
  });
});
