// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { UiAtmosphereDemo } from "./ui-atmosphere-demo";

afterEach(cleanup);

describe("UI atmosphere demo", () => {
  it("shows the three typography roles and the mask-detail action", () => {
    render(<UiAtmosphereDemo />);

    expect(screen.getByRole("heading", { name: "雾中得面" })).toBeTruthy();
    expect(screen.getByText("方正聚珍新仿 · 功能文字候选")).toBeTruthy();
    expect(screen.getByText("魏碑 · 标题文字候选")).toBeTruthy();
    expect(screen.getByText("思源宋体 Light · 内容文字候选")).toBeTruthy();
    expect(screen.getByRole("button", { name: "开始扮演" })).toBeTruthy();
  });
});
