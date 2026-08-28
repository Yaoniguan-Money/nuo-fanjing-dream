// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  test("renders 12 back-only slots and keeps the stage empty until a collected card opens", async () => {
    render(<CodexExperience data={faceData} entries={{ "crown-beard": collectedEntry }} />);
    expect(screen.getByText("已收录 1 / 12")).toBeTruthy();
    expect(screen.getAllByRole("button")).toHaveLength(13);
    expect(screen.getByRole("region", { name: "面具显形台" }).textContent).toContain("显形台尚空");
    expect(document.querySelectorAll(".codex-wall img")).toHaveLength(1);
    expect(screen.getByRole("img", { name: "开路将军面具卡面" })).toBeTruthy();
    expect(screen.getAllByRole("button").filter((button) => button.hasAttribute("disabled"))).toHaveLength(11);
    const card = screen.getByRole("button", { name: "查看已收录的翘冠长须" });
    fireEvent.keyDown(card, { key: "Enter" });
    expect(await screen.findByRole("dialog", { name: "开路将军傩面详情" })).toBeTruthy();
    expect(screen.getByText("前行莫问旧尘埃")).toBeTruthy();
    await waitFor(() => expect(screen.getByRole("dialog", { name: "开路将军傩面详情" }).getAttribute("data-presentation")).toBe("revealed"));
    fireEvent.click(card);
    expect(screen.getByRole("dialog", { name: "开路将军傩面详情" }).getAttribute("data-presentation")).toBe("revealed");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "开路将军傩面详情" })).toBeNull();
    expect(screen.getByRole("region", { name: "面具显形台" }).textContent).toContain("显形台尚空");
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(document.activeElement).toBe(card);
  });

  test("requires confirmation before clearing the local collection", () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal("confirm", confirm);
    render(<CodexExperience data={faceData} entries={{ "crown-beard": collectedEntry }} />);
    fireEvent.click(screen.getByRole("button", { name: "清空本机收录" }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(screen.getByText("已收录 1 / 12")).toBeTruthy();
  });

  test("does not open locked or reserved slots", () => {
    render(<CodexExperience data={faceData} entries={{}} />);
    const locked = screen.getByRole("button", { name: "未得之面，第05谱位" });
    expect((locked as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(locked);
    expect(screen.getByRole("region", { name: "面具显形台" }).textContent).toContain("显形台尚空");
  });
});
