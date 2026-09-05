// @vitest-environment happy-dom

import { existsSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDreamSession } from "@/domain/dream-session";
import { readDreamSession, writeDreamSession } from "@/domain/dream-session/storage";
import { writeGetFaceRitualSession } from "@/domain/get-face/session";
import WishPage from "./page";

const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));

afterEach(() => {
  cleanup();
  router.push.mockReset();
  window.sessionStorage.clear();
});

describe("WishPage route", () => {
  it("exposes /wish through a dedicated page and wish entry component", () => {
    expect(existsSync(join(process.cwd(), "src/app/wish/page.tsx"))).toBe(true);
    expect(existsSync(join(process.cwd(), "src/features/get-face/wish-entry.tsx"))).toBe(true);
  });

  it("clears the previous story session and returns the new wish flow to the codex", () => {
    writeGetFaceRitualSession({
      schemaVersion: "2.0.0",
      phase: "complete",
      name: "阿渡",
      wish: "旧困惑",
      selectedMaskIndex: 2,
      cardId: "dream.jiu-wei-tu-di-shen.di-jiu-tan"
    });
    writeDreamSession(createDreamSession("旧困惑", {
      schemaVersion: "1.0.0",
      cardId: "dream.jiu-wei-tu-di-shen.di-jiu-tan",
      provider: "deterministic-local",
      confidence: 0.8,
      reason: "fixture"
    }));

    render(<WishPage />);

    expect(screen.getByRole("heading", { name: "阿渡，此刻何事令你止步？" })).toBeTruthy();
    expect(readDreamSession()).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "返回图鉴" }));
    expect(router.push).toHaveBeenCalledWith("/codex");
  });
});
