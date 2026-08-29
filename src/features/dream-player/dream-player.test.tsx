// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { requireDreamCard } from "@/domain/dream-card";
import { DreamPlayer } from "./dream-player";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("DreamPlayer", () => {
  it("shows only the act number before the first line", () => {
    render(<DreamPlayer card={requireDreamCard("dream.kailu-jiangjun.du-shan-ji")} />);

    fireEvent.click(screen.getByRole("button", { name: "进 入 幻 梦" }));

    expect(screen.getAllByText("第 1 幕").length).toBeGreaterThan(0);
    expect(screen.queryByText("点击继续，开始本幕。", { exact: true })).toBeNull();
    expect(screen.queryByText("点击继续 ▽", { exact: true })).toBeNull();
  });

  it("uses the shared navigation and primary ritual controls", () => {
    render(<DreamPlayer card={requireDreamCard("dream.kailu-jiangjun.du-shan-ji")} />);

    expect(screen.getByRole("link", { name: "返回首页" }).className).toContain("ui-return-control");
    expect(screen.getByRole("button", { name: "进 入 幻 梦" }).className).toContain("ui-primary-cta");
  });

  it("lets the player toggle music and choose from four supplied tracks", async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
    render(<DreamPlayer card={requireDreamCard("dream.kailu-jiangjun.du-shan-ji")} />);
    fireEvent.click(screen.getByRole("button", { name: "进 入 幻 梦" }));

    const toggle = screen.getByRole("button", { name: "播放故事音乐" });
    fireEvent.click(toggle);
    expect(play).toHaveBeenCalledOnce();
    expect(toggle.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "选择故事音乐" }));
    expect(screen.getAllByRole("menuitemradio")).toHaveLength(4);
    fireEvent.click(screen.getByRole("menuitemradio", { name: "中式和鸣" }));
    expect(screen.getByLabelText("故事背景音乐").getAttribute("src")).toContain("chinese-harmony");

    fireEvent.click(screen.getByRole("button", { name: "暂停故事音乐" }));
    expect(pause).toHaveBeenCalled();
  });
});
