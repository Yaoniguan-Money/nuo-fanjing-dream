// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { normalizeCodexEntry, type CodexEntry } from "@/domain/codex";
import { faceData } from "@/domain/get-face";
import { CodexExperience } from "./codex-experience";

const viewerSpies = vi.hoisted(() => ({
  zoomIn: vi.fn(),
  zoomOut: vi.fn(),
  reset: vi.fn(),
  dispose: vi.fn()
}));

vi.mock("./mask-relief-viewer", () => ({
  MaskReliefViewer: class {
    mount = vi.fn(async () => undefined);
    zoomIn = viewerSpies.zoomIn;
    zoomOut = viewerSpies.zoomOut;
    reset = viewerSpies.reset;
    dispose = viewerSpies.dispose;
  }
}));

const collectedEntry = normalizeCodexEntry({
  mask: { id: "crown-beard", name: "翘冠长须", asset: "/dream-assets/masks/mask-01.png", visual: {} },
  role: { id: "path-general", name: "开路将军", duty: "开障引路", kind: "traditional_reference", signs: ["翘冠"], background: "借开路将军的叙事意义而设。" },
  visualText: "视觉母体说明", reasonText: "授面理由说明", omen: { status: "ready", qian: "前行莫问旧尘埃", jie: "先辨来路。" }, sources: []
}) as CodexEntry;

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("CodexExperience", () => {
  test("renders 12 back-only slots and keeps the stage empty until a collected card opens", async () => {
    render(<CodexExperience data={faceData} entries={{ "crown-beard": collectedEntry }} />);
    expect(screen.getByText("已收录 1 / 12")).toBeTruthy();
    expect(screen.getAllByRole("button")).toHaveLength(13);
    expect(screen.getByRole("region", { name: "面具显形台" }).textContent).toContain("显形台尚空");
    expect(document.querySelectorAll(".codex-wall img")).toHaveLength(0);
    expect(screen.getAllByRole("button").filter((button) => button.hasAttribute("disabled"))).toHaveLength(11);
    const card = screen.getByRole("button", { name: "查看已收录的翘冠长须" });
    fireEvent.keyDown(card, { key: "Enter" });
    const dialog = await screen.findByRole("dialog", { name: "开路将军" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.getByText("前行莫问旧尘埃")).toBeTruthy();
    await waitFor(() => expect(screen.getByRole("dialog", { name: "开路将军" }).getAttribute("data-presentation")).toBe("revealed"));
    const zoomOut = screen.getByRole("button", { name: "缩小面具" });
    const zoomIn = screen.getByRole("button", { name: "放大面具" });
    await waitFor(() => expect((zoomIn as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(zoomOut);
    fireEvent.click(zoomIn);
    fireEvent.click(screen.getByRole("button", { name: "复位" }));
    expect(viewerSpies.zoomOut).toHaveBeenCalledOnce();
    expect(viewerSpies.zoomIn).toHaveBeenCalledOnce();
    expect(viewerSpies.reset).toHaveBeenCalledOnce();
    fireEvent.click(card);
    expect(screen.getByRole("dialog", { name: "开路将军" }).getAttribute("data-presentation")).toBe("revealed");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "开路将军" })).toBeNull();
    expect(document.body.style.overflow).toBe("");
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
