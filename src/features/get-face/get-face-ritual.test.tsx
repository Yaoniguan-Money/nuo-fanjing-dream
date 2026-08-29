// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { writeGetFaceRitualSession, type GetFaceRitualSession } from "@/domain/get-face/session";
import { GetFaceRitual } from "./get-face-ritual";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe("GetFaceRitual", () => {
  it("keeps the requested large corner logo on the question page", () => {
    const onReturn = vi.fn();
    const { container } = render(<GetFaceRitual onReturn={onReturn} />);
    expect(screen.getByRole("heading", { name: "来者何人？" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "返回首页" }));
    expect(onReturn).toHaveBeenCalledOnce();
    expect(container.querySelector(".get-face-brand-mark")).toBeTruthy();
    expect(screen.getByRole("img", { name: "大傩幻梦品牌标识" })).toBeTruthy();
  });

  it("uses the shared ritual controls for returning and advancing", () => {
    render(<GetFaceRitual onReturn={vi.fn()} />);

    expect(screen.getByRole("button", { name: "返回首页" }).className).toContain("ui-return-control");
    expect(screen.getByRole("button", { name: "继续" }).className).toContain("ui-continue-control");
  });

  it("renders all eight masks as front-and-back ritual objects", () => {
    const matching: GetFaceRitualSession = {
      schemaVersion: "2.0.0",
      phase: "matching",
      name: "阿渡",
      wish: "我想找到自己的位置",
      selectedMaskIndex: null,
      selectedMaskId: null,
      cardId: null
    };
    writeGetFaceRitualSession(matching);
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(() => {}));
    render(<GetFaceRitual onReturn={vi.fn()} />);

    expect(screen.getByLabelText("八面傩面正在候坛")).toBeTruthy();
    expect(screen.getByLabelText("八面傩面正在候坛").getAttribute("data-orbit-mode")).toBe("spatial");
    expect(screen.getAllByTestId("ritual-mask")).toHaveLength(8);
    expect(screen.getByRole("img", { name: "阿布摩傩面正面" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "阿布摩傩面背面" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "八面候坛" })).toBeTruthy();
  });

  it("keeps the seven unselected masks as a dim result ring", () => {
    writeGetFaceRitualSession({
      schemaVersion: "2.0.0",
      phase: "mask",
      name: "阿渡",
      wish: "我想找到自己的位置",
      selectedMaskIndex: null,
      selectedMaskId: "bound-hair",
      cardId: "dream.jiu-wei-tu-di-shen.di-jiu-tan"
    });
    const { container } = render(<GetFaceRitual onReturn={vi.fn()} />);

    expect(screen.getByLabelText("八面傩面正在候坛").getAttribute("data-orbit-mode")).toBe("result-ring");
    expect(container.querySelectorAll(".orbit-mask.dismissed")).toHaveLength(7);
    expect(container.querySelector('.orbit-mask[data-mask-id="bound-hair"]')?.className).toContain("selected");
  });
});
