// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { getThresholdRuntimeSnapshot } from "./runtime-lifecycle";
import { createThresholdScene } from "./threshold-scene";

describe("createThresholdScene", () => {
  afterEach(() => vi.restoreAllMocks());

  it("falls back to the CSS scene when WebGL is unavailable", async () => {
    const canvas = document.createElement("canvas");
    canvas.getContext = vi.fn(() => null) as typeof canvas.getContext;
    const mountain = document.createElement("div");
    const hall = document.createElement("div");
    const village = document.createElement("div");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const scene = createThresholdScene({ canvas, mountain, hall, village });

    expect(canvas.hidden).toBe(true);
    expect(canvas.dataset.renderMode).toBe("css-fallback");
    expect(getThresholdRuntimeSnapshot().activeScenes).toBe(1);
    await scene.intro();
    await scene.openDoor();
    expect(hall.style.opacity).toBe("1");
    expect(village.style.opacity).toBe("0");
    expect(warn).toHaveBeenCalledOnce();

    scene.dispose();
    expect(getThresholdRuntimeSnapshot().activeScenes).toBe(0);
  });
});
