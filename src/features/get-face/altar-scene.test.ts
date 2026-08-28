import { describe, expect, it } from "vitest";
import {
  ALTAR_MASK_INDICES,
  ALTAR_SCENE_PHASES,
  altarOrbitPose,
  altarPhaseAt,
  firstAltarSlotForMask,
  nextAltarScenePhase
} from "./altar-scene";

describe("altar scene", () => {
  it("keeps the final seven-slot mask order, including duplicates", () => {
    expect(ALTAR_MASK_INDICES).toEqual([0, 2, 1, 3, 0, 1, 2]);
    expect(firstAltarSlotForMask(0)).toBe(0);
    expect(firstAltarSlotForMask(2)).toBe(1);
    expect(firstAltarSlotForMask(3)).toBe(3);
    expect(firstAltarSlotForMask(9)).toBe(-1);
  });

  it("produces finite, bounded visual poses for every slot", () => {
    for (const slot of ALTAR_MASK_INDICES.keys()) {
      const pose = altarOrbitPose(slot, Math.PI * 1.25, { width: 1440, height: 900 });
      expect(Object.values(pose).every(Number.isFinite)).toBe(true);
      expect(pose.scale).toBeGreaterThanOrEqual(0.62);
      expect(pose.scale).toBeLessThanOrEqual(0.96);
      expect(pose.opacity).toBeGreaterThanOrEqual(0.26);
      expect(pose.opacity).toBeLessThanOrEqual(0.74);
    }
  });

  it("exposes the cinematic phase order and timing boundaries", () => {
    expect(ALTAR_SCENE_PHASES).toEqual(["selecting", "spinning", "ejecting", "revealing", "impact", "blackout"]);
    expect(altarPhaseAt(0)).toBe("selecting");
    expect(altarPhaseAt(300)).toBe("spinning");
    expect(altarPhaseAt(1800)).toBe("ejecting");
    expect(altarPhaseAt(2300)).toBe("revealing");
    expect(altarPhaseAt(3100)).toBe("impact");
    expect(altarPhaseAt(4000)).toBe("blackout");
    expect(nextAltarScenePhase("spinning")).toBe("ejecting");
    expect(nextAltarScenePhase("blackout")).toBeNull();
  });
});
