// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThresholdExperience } from "./threshold-experience";

describe("ThresholdExperience", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  it("starts from the game logo and falls through when the intro video is not supplied", async () => {
    const cross = vi.fn();
    render(<ThresholdExperience minimumLoadMs={0} preload={async (onProgress) => onProgress(100)} onCrossThreshold={cross} />);
    expect(screen.getByRole("button", { name: "开始入梦" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "直接进入图鉴" }).getAttribute("href")).toBe("/codex");
    expect(screen.getByAltText("大傩幻梦")).toBeTruthy();
    expect(screen.queryByText("戴上一面，成为戏中人")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "开始入梦" }));
    await waitFor(() => expect(cross).toHaveBeenCalledTimes(1), { timeout: 2000 });
  });

  it("plays an optional video and crosses after it ends", async () => {
    const cross = vi.fn();
    render(<ThresholdExperience introVideoSrc="/intro.mp4" minimumLoadMs={0} preload={async (onProgress) => onProgress(100)} onCrossThreshold={cross} />);
    fireEvent.click(screen.getByRole("button", { name: "开始入梦" }));
    const video = await screen.findByLabelText("入梦开场影片");
    fireEvent.ended(video);
    expect(cross).toHaveBeenCalledTimes(1);
  });

  it("shows the branded loading screen and real progress before the video", async () => {
    let finish: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => { finish = resolve; });
    const preload = vi.fn(async (onProgress: (value: number) => void) => {
      onProgress(46);
      await gate;
      onProgress(100);
    });
    render(<ThresholdExperience introVideoSrc="/intro.mp4" minimumLoadMs={0} preload={preload} onCrossThreshold={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "开始入梦" }));
    expect(await screen.findByRole("heading", { name: "幻梦加载中" }, { timeout: 2000 })).toBeTruthy();
    const progress = screen.getByRole("progressbar", { name: "幻梦加载进度" });
    await waitFor(() => expect(progress.getAttribute("aria-valuenow")).toBe("46"));
    expect(screen.getByAltText("大傩幻梦加载标识")).toBeTruthy();

    finish();
    expect(await screen.findByLabelText("入梦开场影片", {}, { timeout: 2000 })).toBeTruthy();
  });

  it("starts the default asset preload only once while progress updates rerender the screen", async () => {
    const cross = vi.fn();
    let created = 0;
    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        created += 1;
        if (created <= 13) queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("Image", FakeImage);

    render(<ThresholdExperience minimumLoadMs={0} onCrossThreshold={cross} />);
    fireEvent.click(screen.getByRole("button", { name: "开始入梦" }));

    await waitFor(() => expect(cross).toHaveBeenCalledTimes(1), { timeout: 1800 });
    expect(created).toBe(13);
  });

  it("clears the loading completion timer when the screen unmounts", async () => {
    vi.useFakeTimers();
    const cross = vi.fn();
    const { unmount } = render(<ThresholdExperience minimumLoadMs={0} preload={async () => undefined} onCrossThreshold={cross} />);
    fireEvent.click(screen.getByRole("button", { name: "开始入梦" }));

    await act(async () => {
      vi.advanceTimersByTime(720);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole("heading", { name: "幻梦加载中" })).toBeTruthy();
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
    vi.runAllTimers();
    expect(cross).not.toHaveBeenCalled();
  });
});
