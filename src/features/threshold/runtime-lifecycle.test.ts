import { describe, expect, it, vi } from "vitest";
import { addTrackedListener, getThresholdRuntimeSnapshot, startTrackedRafLoop, trackScene } from "./runtime-lifecycle";

describe("threshold runtime lifecycle", () => {
  it("returns every scene, RAF and global listener counter to zero across remounts", () => {
    for (let mount = 0; mount < 3; mount += 1) {
      const releaseScene = trackScene();
      const target = new EventTarget();
      const removeListener = addTrackedListener(target, "resize", vi.fn());
      let scheduled: FrameRequestCallback | undefined;
      const stopRaf = startTrackedRafLoop(vi.fn(), (callback) => { scheduled = callback; return 42; }, vi.fn());
      expect(getThresholdRuntimeSnapshot()).toEqual({ activeScenes: 1, activeRafLoops: 1, activeGlobalListeners: 1 });
      scheduled?.(16);
      stopRaf();
      removeListener();
      releaseScene();
      expect(getThresholdRuntimeSnapshot()).toEqual({ activeScenes: 0, activeRafLoops: 0, activeGlobalListeners: 0 });
    }
  });
});
