import { describe, expect, it } from "vitest";
import { calculateCollectionFlight, collectionFlightTiming } from "./collection-flight";

describe("collection flight geometry", () => {
  it("moves the mask between the real centers of the reveal and codex slot", () => {
    expect(calculateCollectionFlight(
      { left: 400, top: 200, width: 200, height: 300 },
      { left: 40, top: 600, width: 120, height: 160 }
    )).toEqual({ x: -400, y: 330, scale: 160 / 300 });
  });

  it("keeps a stable scale when a browser reports an empty source rectangle", () => {
    expect(calculateCollectionFlight(
      { left: 30, top: 40, width: 0, height: 0 },
      { left: 120, top: 160, width: 80, height: 100 }
    )).toEqual({ x: 130, y: 170, scale: 1 });
  });

  it("collapses travel and settle motion for reduced-motion users", () => {
    expect(collectionFlightTiming(false)).toEqual({ travelMs: 700, settleMs: 400 });
    expect(collectionFlightTiming(true)).toEqual({ travelMs: 0, settleMs: 0 });
  });
});
