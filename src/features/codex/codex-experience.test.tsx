// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { normalizeCodexEntry, type CodexEntry } from "@/domain/codex";
import { faceData } from "@/domain/get-face";
import { CodexExperience } from "./codex-experience";

vi.mock("./mask-relief-viewer", () => ({
  MaskReliefViewer: class {
    mount = vi.fn(async () => undefined);
    reset = vi.fn();
    dispose = vi.fn();
  }
}));

const collectedEntry = normalizeCodexEntry({
  mask: { id: "crown-beard", name: "翘冠长须", asset: "/dream-assets/masks/mask-01.png", visual: {} },
  role: { id: "path-general", name: "开路将军", duty: "开障引路", kind: "traditional_reference", signs: ["翘冠"], background: "借开路将军的叙事意义而设。" },
  visualText: "视觉母体说明", reasonText: "授面理由说明", omen: { status: "ready", qian: "前行莫问旧尘埃", jie: "先辨来路。" }, sources: []
}) as CodexEntry;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CodexExperience", () => {
  test("renders a 12-slot wall and opens collected details with keyboard focus restore", async () => {
    render(<CodexExperience data={faceData} entries={{ "crown-beard": collectedEntry }} />);
    expect(screen.getByText("已收录 1 / 4")).toBeTruthy();
    expect(screen.getAllByRole("button")).toHaveLength(13);
    const card = screen.getByRole("button", { name: "查看已收录的翘冠长须" });
    fireEvent.keyDown(card, { key: "Enter" });
    expect(await screen.findByRole("dialog", { name: "开路将军傩面详情" })).toBeTruthy();
    expect(screen.getByText("前行莫问旧尘埃")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(document.activeElement).toBe(card);
  });

  test("requires confirmation before clearing the local collection", () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal("confirm", confirm);
    render(<CodexExperience data={faceData} entries={{ "crown-beard": collectedEntry }} />);
    fireEvent.click(screen.getByRole("button", { name: "清空本机收录" }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(screen.getByText("已收录 1 / 4")).toBeTruthy();
  });
});
