import { describe, expect, test } from "vitest";
import { faceData } from "@/domain/get-face";
import { buildCodexSlots, collectedCount, codexNumber, slotLabel } from "./codex-model";

describe("codex feature model", () => {
  test("always exposes four mask slots followed by eight reserved slots", () => {
    const slots = buildCodexSlots(faceData, {});
    expect(slots).toHaveLength(12);
    expect(slots.slice(0, 4).every((slot) => slot.kind === "mask" && slot.state === "locked")).toBe(true);
    expect(slots.slice(4).every((slot) => slot.kind === "reserved" && slot.state === "reserved")).toBe(true);
  });

  test("counts only collected masks and labels reserved positions accessibly", () => {
    const slots = buildCodexSlots(faceData, {});
    expect(collectedCount(slots)).toBe(0);
    expect(slotLabel(slots[4])).toBe("待补傩面位置");
    expect(codexNumber(0)).toBe("01");
    expect(codexNumber(11)).toBe("12");
  });
});
