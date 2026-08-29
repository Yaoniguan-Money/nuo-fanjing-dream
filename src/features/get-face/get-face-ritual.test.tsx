// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GetFaceRitual } from "./get-face-ritual";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("GetFaceRitual", () => {
  it("renders the brand mark in the lower-right corner before asking for a name", () => {
    const onReturn = vi.fn();
    const { container } = render(<GetFaceRitual onReturn={onReturn} />);
    expect(screen.getByRole("heading", { name: "来者何人？" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "返回首页" }));
    expect(onReturn).toHaveBeenCalledOnce();
    const mark = within(container.querySelector(".get-face-brand-mark")!).getByRole("img", { name: "大傩幻梦品牌标识" });
    expect(mark.getAttribute("src")).toContain("%2Fdream-assets%2Fbrand%2Fnuo-dream-logo-dark.png");
  });
});
