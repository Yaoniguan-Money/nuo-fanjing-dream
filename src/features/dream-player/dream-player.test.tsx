// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { requireDreamCard } from "@/domain/dream-card";
import { DreamPlayer } from "./dream-player";

afterEach(cleanup);

describe("DreamPlayer", () => {
  it("shows only the act number before the first line", () => {
    render(<DreamPlayer card={requireDreamCard("dream.kailu-jiangjun.du-shan-ji")} />);

    fireEvent.click(screen.getByRole("button", { name: "进 入 幻 梦" }));

    expect(screen.getAllByText("第 1 幕").length).toBeGreaterThan(0);
    expect(screen.queryByText("点击继续，开始本幕。", { exact: true })).toBeNull();
    expect(screen.queryByText("点击继续 ▽", { exact: true })).toBeNull();
  });
});
