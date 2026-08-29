// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET_FACE_RITUAL_STORAGE_KEY, writeGetFaceRitualSession } from "@/domain/get-face/session";
import { GetFaceRitual } from "./get-face-ritual";

const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  router.push.mockReset();
  window.sessionStorage.removeItem(GET_FACE_RITUAL_STORAGE_KEY);
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

  it("keeps the teammate matching reveal and enters the story after the explicit dream entry", async () => {
    vi.useFakeTimers();
    writeGetFaceRitualSession({
      schemaVersion: "2.0.0",
      phase: "mask",
      name: "阿渡",
      wish: "我想找到一条路",
      selectedMaskIndex: 0,
      cardId: "dream.kailu-jiangjun.du-shan-ji"
    });

    const { container } = render(<GetFaceRitual onReturn={vi.fn()} />);

    expect(container.querySelector(".mask-match-stage")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "入 戏" })).toBeNull();

    await act(async () => { await vi.advanceTimersByTimeAsync(520); });
    fireEvent.click(screen.getByRole("button", { name: "入 戏" }));
    expect(container.querySelector('.get-face-ritual[data-phase="wearing"]')).toBeTruthy();
    await act(async () => { await vi.advanceTimersByTimeAsync(920); });

    expect(router.push).toHaveBeenCalledWith("/dream/dream.kailu-jiangjun.du-shan-ji");
  });
});
