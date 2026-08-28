// @vitest-environment happy-dom

import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThresholdExperience } from "./threshold-experience";
import { getThresholdRuntimeSnapshot, startTrackedRafLoop, trackScene } from "./runtime-lifecycle";
import * as thresholdSceneModule from "./threshold-scene";

describe("ThresholdExperience remount lifecycle", () => {
  afterEach(() => vi.restoreAllMocks());

  it("does not retain a scene, RAF loop or global listener after repeated leaves", async () => {
    vi.spyOn(thresholdSceneModule, "createThresholdScene").mockImplementation(() => {
      const releaseScene = trackScene();
      const stopRaf = startTrackedRafLoop(() => undefined, () => 7, () => undefined);
      let disposed = false;
      return {
        resize: () => undefined,
        intro: async () => undefined,
        openDoor: async () => undefined,
        dispose: () => {
          if (disposed) return;
          disposed = true;
          stopRaf();
          releaseScene();
        }
      } as ReturnType<typeof thresholdSceneModule.createThresholdScene>;
    });

    for (let iteration = 0; iteration < 3; iteration += 1) {
      const view = render(<ThresholdExperience onCrossThreshold={vi.fn()} />);
      await waitFor(() => expect(getThresholdRuntimeSnapshot()).toEqual({ activeScenes: 1, activeRafLoops: 1, activeGlobalListeners: 3 }));
      view.unmount();
      expect(getThresholdRuntimeSnapshot()).toEqual({ activeScenes: 0, activeRafLoops: 0, activeGlobalListeners: 0 });
    }
  });
});
