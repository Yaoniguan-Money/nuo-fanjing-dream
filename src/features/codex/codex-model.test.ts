import { describe, expect, test } from "vitest";
import { faceData } from "@/domain/get-face";
import { buildCodexSlots, collectedCount, codexNumber, slotLabel } from "./codex-model";

describe("codex feature model", () => {
  test("exposes the eight configured mask slots", () => {
    const slots = buildCodexSlots(faceData, {});
    expect(slots).toHaveLength(8);
    expect(slots.every((slot) => slot.kind === "mask" && slot.state === "locked")).toBe(true);
  });

  test("counts only collected masks and labels every unavailable position as locked", () => {
    const slots = buildCodexSlots(faceData, {});
    expect(collectedCount(slots)).toBe(0);
    expect(slotLabel(slots[4])).toBe("未得之面，第05谱位");
    expect(codexNumber(0)).toBe("01");
    expect(codexNumber(11)).toBe("12");
  });
});
