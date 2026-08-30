// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThresholdExperience } from "./threshold-experience";
import { ThresholdShell } from "./threshold-shell";

const sessions = vi.hoisted(() => ({
  clearDreamSession: vi.fn(),
  clearGetFaceRitualSession: vi.fn()
}));

vi.mock("@/domain/dream-session/storage", () => ({ clearDreamSession: sessions.clearDreamSession }));
vi.mock("@/domain/get-face/session", () => ({ clearGetFaceRitualSession: sessions.clearGetFaceRitualSession }));
vi.mock("@/features/preload/resource-preloader", () => ({ preloadNextRitualStage: vi.fn() }));

describe("ThresholdExperience", () => {
  afterEach(() => {
    cleanup();
    sessions.clearDreamSession.mockClear();
    sessions.clearGetFaceRitualSession.mockClear();
  });
  it("starts from the game logo and falls through when the intro video is not supplied", async () => {
    const cross = vi.fn();
    render(<ThresholdExperience onCrossThreshold={cross} />);
    expect(screen.getByRole("button", { name: "开始入梦" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "直接进入图鉴" }).getAttribute("href")).toBe("/codex");
    expect(screen.getByAltText("大傩幻梦")).toBeTruthy();
    expect(screen.queryByText("戴上一面，成为戏中人")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "开始入梦" }));
    await waitFor(() => expect(cross).toHaveBeenCalledTimes(1), { timeout: 2000 });
  });

  it("plays an optional video and crosses after it ends", async () => {
    const cross = vi.fn();
    render(<ThresholdExperience introVideoSrc="/intro.mp4" onCrossThreshold={cross} />);
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
});
