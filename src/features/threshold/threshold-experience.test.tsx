// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThresholdExperience } from "./threshold-experience";

describe("ThresholdExperience", () => {
  afterEach(cleanup);
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
});
