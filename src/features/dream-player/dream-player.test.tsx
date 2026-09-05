// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getDreamActAssetUrls, getDreamCardAssetUrls, requireDreamCard, type DreamCard } from "@/domain/dream-card";
import { preloadUrls } from "@/features/preload/resource-preloader";
import { DreamPlayer } from "./dream-player";

vi.mock("@/features/preload/resource-preloader", () => ({
  preloadMatchedDreamResources: vi.fn(async () => undefined),
  preloadUrls: vi.fn()
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function twoActCard(): DreamCard {
  const card = structuredClone(requireDreamCard("dream.kailu-jiangjun.du-shan-ji"));
  card.data.acts = card.data.acts.slice(0, 2).map((act) => ({
    ...act,
    texts: act.texts.slice(0, 1).map((text) => ({
      ...text,
      display: { mode: "instant", advance: "manual" }
    }))
  }));
  return card;
}

function deferredImageDecodes() {
  const urls: string[] = [];
  const resolvers: Array<() => void> = [];
  class DeferredImage {
    decoding = "auto";
    src = "";
    decode() {
      urls.push(this.src);
      return new Promise<void>((resolve) => resolvers.push(resolve));
    }
  }
  vi.stubGlobal("Image", DeferredImage);
  return { urls, resolveAll: () => resolvers.splice(0).forEach((resolve) => resolve()) };
}

async function showOnlyLineOfFirstAct() {
  fireEvent.click(screen.getByRole("button", { name: "进 入 幻 梦" }));
  fireEvent.click(document.querySelector<HTMLElement>(".play-view")!);
  await act(async () => { vi.advanceTimersByTime(0); });
}

describe("DreamPlayer", () => {
  it("shows only the act number before the first line", () => {
    render(<DreamPlayer card={requireDreamCard("dream.kailu-jiangjun.du-shan-ji")} />);

    fireEvent.click(screen.getByRole("button", { name: "进 入 幻 梦" }));

    expect(screen.getAllByText("第 1 幕").length).toBeGreaterThan(0);
    expect(screen.queryByText("点击继续，开始本幕。", { exact: true })).toBeNull();
    expect(screen.queryByText("点击继续 ▽", { exact: true })).toBeNull();
  });

  it("在用户点击手势内播放，并可切换四首本地音乐与暂停", async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => undefined);
    render(<DreamPlayer card={requireDreamCard("dream.kailu-jiangjun.du-shan-ji")} />);
    fireEvent.click(screen.getByRole("button", { name: "进 入 幻 梦" }));

    const toggle = screen.getByRole("button", { name: "播放故事音乐" });
    fireEvent.click(toggle);

    expect(play).toHaveBeenCalledOnce();
    await waitFor(() => expect(toggle.getAttribute("aria-pressed")).toBe("true"));

    fireEvent.click(screen.getByRole("button", { name: "选择故事音乐" }));
    expect(screen.getAllByRole("menuitemradio").map((item) => item.textContent)).toEqual([
      "中式弦歌一",
      "中式弦歌二",
      "古意行旅",
      "中式和鸣"
    ]);
    fireEvent.click(screen.getByRole("menuitemradio", { name: "中式和鸣" }));

    expect(screen.getByLabelText("故事背景音乐").getAttribute("src")).toBe("/dream-assets/audio/music/chinese-harmony.mp3");
    expect(play).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("button", { name: "暂停故事音乐" }));
    expect(pause).toHaveBeenCalledOnce();
  });

  it("选择一首曲目后立即开始播放", async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => undefined);
    render(<DreamPlayer card={requireDreamCard("dream.kailu-jiangjun.du-shan-ji")} />);
    fireEvent.click(screen.getByRole("button", { name: "进 入 幻 梦" }));

    fireEvent.click(screen.getByRole("button", { name: "选择故事音乐" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "古意行旅" }));

    expect(play).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "暂停故事音乐" })).toBeTruthy();
  });

  it("浏览器拒绝播放时恢复为未播放状态", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(new DOMException("blocked", "NotAllowedError"));

    render(<DreamPlayer card={requireDreamCard("dream.kailu-jiangjun.du-shan-ji")} />);
    fireEvent.click(screen.getByRole("button", { name: "进 入 幻 梦" }));
    fireEvent.click(screen.getByRole("button", { name: "播放故事音乐" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "播放故事音乐" }).getAttribute("aria-pressed")).toBe("false"));
  });

  it("保留 main 的全卡与下一幕 idle 预加载", async () => {
    const card = twoActCard();
    render(<DreamPlayer card={card} />);

    await waitFor(() => {
      expect(vi.mocked(preloadUrls)).toHaveBeenCalledWith(getDreamCardAssetUrls(card), { strategy: "idle", concurrency: 2 });
      expect(vi.mocked(preloadUrls)).toHaveBeenCalledWith(getDreamActAssetUrls(card.data.acts[1]), { strategy: "idle", concurrency: 2 });
    });
  });

  it("渐黑 320ms 后等待下一幕资源，再原子切换并渐显 460ms", async () => {
    vi.useFakeTimers();
    const images = deferredImageDecodes();
    const card = twoActCard();
    render(<DreamPlayer card={card} />);
    await showOnlyLineOfFirstAct();

    fireEvent.click(document.querySelector<HTMLElement>(".play-view")!);
    const shell = document.querySelector<HTMLElement>(".player-shell")!;
    expect(shell.dataset.actTransition).toBe("fading-out");
    expect(screen.getByText(card.data.acts[0].title)).toBeTruthy();
    expect(screen.queryByText(card.data.acts[1].title)).toBeNull();
    expect(images.urls).toEqual(getDreamActAssetUrls(card.data.acts[1]));

    await act(async () => { vi.advanceTimersByTime(319); });
    expect(screen.queryByText(card.data.acts[1].title)).toBeNull();
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(shell.dataset.actTransition).toBe("waiting");
    expect(screen.queryByText(card.data.acts[1].title)).toBeNull();

    await act(async () => { images.resolveAll(); await Promise.resolve(); });
    expect(shell.dataset.actTransition).toBe("fading-in");
    expect(screen.getByText(card.data.acts[1].title)).toBeTruthy();
    expect(screen.queryByText(card.data.acts[1].texts[0].content)).toBeNull();

    fireEvent.click(document.querySelector<HTMLElement>(".play-view")!);
    expect(screen.queryByText(card.data.acts[1].texts[0].content)).toBeNull();
    await act(async () => { vi.advanceTimersByTime(459); });
    expect(shell.dataset.actTransition).toBe("fading-in");
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(shell.dataset.actTransition).toBe("idle");

    fireEvent.click(document.querySelector<HTMLElement>(".play-view")!);
    await act(async () => { vi.advanceTimersByTime(0); });
    expect(screen.getByText(card.data.acts[1].texts[0].content)).toBeTruthy();
  });

  it("prefers-reduced-motion 下缩短动画但仍先等资源再切换", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    const images = deferredImageDecodes();
    const card = twoActCard();
    render(<DreamPlayer card={card} />);
    await showOnlyLineOfFirstAct();

    fireEvent.click(document.querySelector<HTMLElement>(".play-view")!);
    const shell = document.querySelector<HTMLElement>(".player-shell")!;
    expect(shell.dataset.actTransition).toBe("fading-out");
    images.resolveAll();
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByText(card.data.acts[1].title)).toBeNull();

    await act(async () => { vi.advanceTimersByTime(1); await Promise.resolve(); });
    expect(shell.dataset.actTransition).toBe("fading-in");
    expect(screen.getByText(card.data.acts[1].title)).toBeTruthy();
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(shell.dataset.actTransition).toBe("idle");
  });
});
