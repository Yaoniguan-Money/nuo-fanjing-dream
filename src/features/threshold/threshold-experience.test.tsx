// @vitest-environment happy-dom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("captures the active pointer so a small finger movement does not cancel the hold", async () => {
    vi.spyOn(thresholdSceneModule, "createThresholdScene").mockImplementation(() => ({
      resize: () => undefined,
      intro: async () => undefined,
      openDoor: async () => undefined,
      dispose: () => undefined
    }) as ReturnType<typeof thresholdSceneModule.createThresholdScene>);

    const view = render(<ThresholdExperience onCrossThreshold={vi.fn()} />);
    const ring = screen.getByRole("button", { name: "按住门环" });
    await waitFor(() => expect((ring as HTMLButtonElement).disabled).toBe(false));
    const setPointerCapture = vi.fn();
    Object.defineProperty(ring, "setPointerCapture", { configurable: true, value: setPointerCapture });

    fireEvent.pointerDown(ring, { pointerId: 7, isPrimary: true, button: 0 });

    expect(setPointerCapture).toHaveBeenCalledWith(7);
    expect(ring.getAttribute("aria-describedby")).toBe("threshold-hold-hint");
    expect(screen.getByText("触碰并长按门环")).toBeTruthy();
    view.unmount();
  });
});
