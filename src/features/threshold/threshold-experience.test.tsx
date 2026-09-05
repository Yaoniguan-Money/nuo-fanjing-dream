// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThresholdExperience } from "./threshold-experience";
import { ThresholdShell } from "./threshold-shell";

const sessions = vi.hoisted(() => ({
  clearDreamSession: vi.fn(),
  clearGetFaceRitualSession: vi.fn()
}));

vi.mock("@/domain/dream-session/storage", () => ({ clearDreamSession: sessions.clearDreamSession }));
vi.mock("@/domain/get-face/session", () => ({ clearGetFaceRitualSession: sessions.clearGetFaceRitualSession }));
const preloader = vi.hoisted(() => ({
  preloadNextRitualStage: vi.fn(async (onProgress?: (value: number) => void) => { onProgress?.(100); })
}));

vi.mock("@/features/preload/resource-preloader", () => ({ preloadNextRitualStage: preloader.preloadNextRitualStage }));

function mockMedia({ mobile = false, reduced = false } = {}) {
  vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
    matches: query.includes("max-width") ? mobile : reduced,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn()
  })));
}

async function enterLoading() {
  fireEvent.click(screen.getByRole("button", { name: "开始入梦" }));
  await act(async () => {
    vi.advanceTimersByTime(720);
    await Promise.resolve();
  });
}

describe("ThresholdExperience", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    sessions.clearDreamSession.mockClear();
    sessions.clearGetFaceRitualSession.mockClear();
    preloader.preloadNextRitualStage.mockReset();
    preloader.preloadNextRitualStage.mockImplementation(async (onProgress?: (value: number) => void) => { onProgress?.(100); });
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

  it("starts a fresh dream session when the title action is clicked", () => {
    const start = vi.fn();
    render(<ThresholdExperience onCrossThreshold={vi.fn()} onStart={start} />);

    const button = screen.getByRole("button", { name: "开始入梦" });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(start).toHaveBeenCalledTimes(1);
  });

  it("clears transient sessions when a new dream begins", () => {
    render(<ThresholdShell />);

    fireEvent.click(screen.getByRole("button", { name: "开始入梦" }));

    expect(sessions.clearDreamSession).toHaveBeenCalledTimes(1);
    expect(sessions.clearGetFaceRitualSession).toHaveBeenCalledTimes(1);
  });

  it("shows the branded loading screen and reports real progress", async () => {
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
    expect(preload).toHaveBeenCalledTimes(1);

    finish();
    expect(await screen.findByLabelText("入梦开场影片", {}, { timeout: 2000 })).toBeTruthy();
  });

  it("keeps the loading screen visible for at least 1.8 seconds on desktop", async () => {
    vi.useFakeTimers();
    mockMedia();
    render(<ThresholdExperience introVideoSrc="/intro.mp4" preload={async (onProgress) => onProgress(100)} onCrossThreshold={vi.fn()} />);

    await enterLoading();
    expect(screen.getByRole("heading", { name: "幻梦加载中" })).toBeTruthy();
    await act(async () => { vi.advanceTimersByTime(1799); await Promise.resolve(); });
    expect(screen.queryByLabelText("入梦开场影片")).toBeNull();
    await act(async () => { vi.advanceTimersByTime(1); await Promise.resolve(); });
    expect(screen.getByLabelText("入梦开场影片")).toBeTruthy();
  });

  it("keeps the loading screen visible for at least 2.4 seconds on mobile", async () => {
    vi.useFakeTimers();
    mockMedia({ mobile: true });
    render(<ThresholdExperience introVideoSrc="/intro.mp4" preload={async (onProgress) => onProgress(100)} onCrossThreshold={vi.fn()} />);

    await enterLoading();
    await act(async () => { vi.advanceTimersByTime(2399); await Promise.resolve(); });
    expect(screen.queryByLabelText("入梦开场影片")).toBeNull();
    await act(async () => { vi.advanceTimersByTime(1); await Promise.resolve(); });
    expect(screen.getByLabelText("入梦开场影片")).toBeTruthy();
  });

  it("offers a lightweight path after slow-network guidance without abandoning required assets", async () => {
    vi.useFakeTimers();
    mockMedia();
    let finish: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => { finish = resolve; });
    const cross = vi.fn();
    render(<ThresholdExperience introVideoSrc="/intro.mp4" preload={async (onProgress) => {
      onProgress(62);
      await gate;
      onProgress(100);
    }} onCrossThreshold={cross} />);

    await enterLoading();
    await act(async () => { vi.advanceTimersByTime(10_000); });
    expect(screen.getByText("山雾较浓，仍在载入……")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "轻量进入" })).toBeNull();
    await act(async () => { vi.advanceTimersByTime(5_000); });
    fireEvent.click(screen.getByRole("button", { name: "轻量进入" }));
    expect(cross).not.toHaveBeenCalled();

    await act(async () => { finish(); await gate; await Promise.resolve(); });
    expect(cross).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText("入梦开场影片")).toBeNull();
  });

  it("starts one preload task across progress rerenders", async () => {
    let report: (value: number) => void = () => undefined;
    const preload = vi.fn(async (onProgress: (value: number) => void) => {
      report = onProgress;
      await new Promise<void>(() => undefined);
    });
    render(<ThresholdExperience minimumLoadMs={0} preload={preload} onCrossThreshold={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "开始入梦" }));
    expect(await screen.findByRole("heading", { name: "幻梦加载中" }, { timeout: 2000 })).toBeTruthy();
    await waitFor(() => expect(preload).toHaveBeenCalledTimes(1));
    act(() => { report(18); report(57); report(83); });

    expect(screen.getByRole("progressbar", { name: "幻梦加载进度" }).getAttribute("aria-valuenow")).toBe("83");
    expect(preload).toHaveBeenCalledTimes(1);
  });

  it("does not report complete when the optional video finishes before required assets", async () => {
    let reportRequired: (value: number) => void = () => undefined;
    preloader.preloadNextRitualStage.mockImplementation(async (onProgress?: (value: number) => void) => {
      if (onProgress) reportRequired = onProgress;
      await new Promise<void>(() => undefined);
    });
    const nativeCreateElement = document.createElement.bind(document);
    let preloadVideo: HTMLVideoElement | undefined;
    vi.spyOn(document, "createElement").mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
      const element = nativeCreateElement(tagName, options);
      if (tagName === "video" && !preloadVideo) preloadVideo = element as HTMLVideoElement;
      return element;
    }) as typeof document.createElement);
    render(<ThresholdExperience introVideoSrc="/intro.mp4" minimumLoadMs={20_000} onCrossThreshold={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "开始入梦" }));
    const progress = await screen.findByRole("progressbar", { name: "幻梦加载进度" }, { timeout: 2000 });
    await waitFor(() => expect(preloadVideo).toBeDefined());
    act(() => preloadVideo?.dispatchEvent(new Event("loadeddata")));
    await waitFor(() => expect(progress.getAttribute("aria-valuenow")).toBe("20"));
    act(() => reportRequired(50));

    expect(progress.getAttribute("aria-valuenow")).toBe("60");
  });

  it("cancels optional video preloading when lightweight entry is chosen", async () => {
    vi.useFakeTimers();
    mockMedia();
    const nativeCreateElement = document.createElement.bind(document);
    let preloadVideo: HTMLVideoElement | undefined;
    vi.spyOn(document, "createElement").mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
      const element = nativeCreateElement(tagName, options);
      if (tagName === "video" && !preloadVideo) preloadVideo = element as HTMLVideoElement;
      return element;
    }) as typeof document.createElement);
    const cross = vi.fn();
    render(<ThresholdExperience introVideoSrc="/intro.mp4" minimumLoadMs={0} onCrossThreshold={cross} />);

    await enterLoading();
    await act(async () => { vi.advanceTimersByTime(15_000); await Promise.resolve(); });
    fireEvent.click(screen.getByRole("button", { name: "轻量进入" }));

    expect(cross).toHaveBeenCalledTimes(1);
    expect(preloadVideo?.hasAttribute("src")).toBe(false);
  });

  it("aborts preload callbacks and clears loading timers on unmount", async () => {
    vi.useFakeTimers();
    mockMedia();
    let signal: AbortSignal | undefined;
    const cross = vi.fn();
    const { unmount } = render(<ThresholdExperience preload={async (_onProgress, taskSignal) => {
      signal = taskSignal;
      await new Promise<void>(() => undefined);
    }} onCrossThreshold={cross} />);

    await enterLoading();
    expect(signal?.aborted).toBe(false);
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    unmount();
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    vi.runAllTimers();
    expect(cross).not.toHaveBeenCalled();
  });

  it("starts the staged ritual preload once from ThresholdShell", async () => {
    render(<ThresholdShell />);

    fireEvent.click(screen.getByRole("button", { name: "开始入梦" }));

    await waitFor(() => expect(preloader.preloadNextRitualStage).toHaveBeenCalledTimes(1), { timeout: 2000 });
  });
});
