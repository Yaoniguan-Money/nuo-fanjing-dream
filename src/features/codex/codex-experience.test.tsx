// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { normalizeCodexEntry, type CodexEntry } from "@/domain/codex";
import { faceData } from "@/domain/get-face";
import { CodexExperience } from "./codex-experience";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() })
}));

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
  test("exposes the codex as a keyboard-focusable scroll region", () => {
    render(<CodexExperience data={faceData} entries={{}} />);

    const scrollRegion = screen.getByRole("main", { name: "面具图鉴滚动区域" });
    expect(scrollRegion.getAttribute("tabindex")).toBe("0");
  });

  test("offers a direct route to ask another wish without replaying the intro", () => {
    render(<CodexExperience data={faceData} entries={{}} />);

    expect(screen.getByRole("link", { name: "再问一愿" }).getAttribute("href")).toBe("/wish");
  });

  test("renders the configured tiled slots and opens a collected mask in a fullscreen dialog", async () => {
    render(<CodexExperience data={faceData} entries={{ "crown-beard": collectedEntry }} />);
    expect(screen.getByText(`已收录 1 / ${faceData.codex.slots.length}`)).toBeTruthy();
    expect(screen.getAllByRole("button")).toHaveLength(faceData.codex.slots.length + 1);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.querySelectorAll(".codex-wall img")).toHaveLength(1);
    expect(screen.getByRole("img", { name: "开路将军面具卡面" })).toBeTruthy();
    expect(screen.queryByRole("img", { name: "大傩幻梦品牌标识" })).toBeNull();
    expect(screen.getAllByRole("button").filter((button) => button.hasAttribute("disabled"))).toHaveLength(faceData.codex.slots.length - 1);
    const card = screen.getByRole("button", { name: "查看已收录的开路将军" });
    fireEvent.keyDown(card, { key: "Enter" });
    expect(await screen.findByRole("dialog", { name: "开路将军傩面详情" })).toBeTruthy();
    const openingCallouts = Array.from(document.querySelectorAll(".codex-detail-callouts img")).map((image) => image.getAttribute("src"));
    expect(openingCallouts).toHaveLength(3);
    expect(openingCallouts.some((src) => src?.includes("back-rope-wood"))).toBe(true);
    expect(screen.getByRole("img", { name: "开路将军优化傩面" })).toBeTruthy();
    expect(document.querySelector(".codex-main-mask-art")?.getAttribute("data-mask-side")).toBe("enhanced");
    expect(screen.getByRole("img", { name: "梦签签条底图" }).getAttribute("src")).toContain("omen-slip-abu-mo-v2.png");
    expect(document.querySelector(".codex-slip-qian")?.textContent).toBe("山重当奋钺，水阻且成桥。");
    expect(document.querySelector(".codex-slip-kicker")?.textContent).toBe("幻 · 梦 · 回 · 响");
    fireEvent.click(screen.getByRole("button", { name: "查看美化前的实物面具" }));
    expect(screen.getByRole("img", { name: "开路将军实物傩面" }).getAttribute("src")).toContain("mask-original");
    expect(document.querySelector(".codex-main-mask-art")?.getAttribute("data-mask-side")).toBe("original");
    expect(screen.getByRole("button", { name: "返回优化后的游戏面具" })).toBeTruthy();
    expect(screen.getByText(/山重当奋钺，水阻且成桥/)).toBeTruthy();
    await waitFor(() => expect(screen.getByRole("dialog", { name: "开路将军傩面详情" }).getAttribute("data-presentation")).toBe("revealed"));
    fireEvent.click(card);
    expect(screen.getByRole("dialog", { name: "开路将军傩面详情" }).getAttribute("data-presentation")).toBe("revealed");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "开路将军傩面详情" })).toBeNull();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(document.activeElement).toBe(card);
  });

  test("requires confirmation before clearing the local collection", () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal("confirm", confirm);
    render(<CodexExperience data={faceData} entries={{ "crown-beard": collectedEntry }} />);
    fireEvent.click(screen.getByRole("button", { name: "清空本机收录" }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(screen.getByText(`已收录 1 / ${faceData.codex.slots.length}`)).toBeTruthy();
  });

  test("does not open locked or reserved slots", () => {
    render(<CodexExperience data={faceData} entries={{}} />);
    const locked = screen.getByRole("button", { name: "先锋小姐，尚未解锁" });
    expect((locked as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(locked);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("uses the curated omen for a story mask when an older saved entry contains raw story dialogue", async () => {
    const legacyEntry = normalizeCodexEntry({
      mask: { id: "bound-hair", name: "九位土地神", asset: "/dream-assets/masks/mask-03.png", visual: {} },
      role: { id: "land-gods", name: "九位土地神", duty: "各归其位", kind: "traditional_reference", signs: ["长耳"], background: "传统职司说明" },
      visualText: "视觉母体说明",
      reasonText: "授面理由说明",
      omen: {
        status: "ready",
        qian: "界石千年守，寒泉一味清",
        interpretation: "第二年春社，头坛前照旧挤满了人。第九坛前冷清，可不再空着。这里是一段不该进入详情页的大段剧情原文。"
      },
      sources: []
    }) as CodexEntry;

    render(<CodexExperience data={faceData} entries={{ "bound-hair": legacyEntry }} />);
    fireEvent.click(screen.getByRole("button", { name: "查看已收录的九位土地神" }));

    expect(await screen.findByText(/诸事分其位，群力各有归/)).toBeTruthy();
    expect(screen.queryByText(/第二年春社，头坛前照旧挤满了人/)).toBeNull();
  });

  test("renders the supplied close-up crops for a non-story mask", async () => {
    render(<CodexExperience data={faceData} demoMode />);
    fireEvent.change(screen.getByLabelText("演示"), { target: { value: "all" } });
    expect(screen.getByRole("button", { name: "查看已收录的先锋小姐" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "查看已收录的九位土地神" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "扫地和尚面具卡面" }).className).toContain("codex-card-mask-sao-di-he-shang");
    fireEvent.click(await screen.findByRole("button", { name: "查看已收录的阿布摩" }));

    await screen.findByRole("dialog", { name: "阿布摩傩面详情" });
    const detailImages = Array.from(document.querySelectorAll(".codex-detail-callouts img")).map((image) => image.getAttribute("src"));
    expect(detailImages.some((src) => src?.includes("white-headwrap"))).toBe(true);
    expect(detailImages.some((src) => src?.includes("beard-fibers"))).toBe(true);
  });

  test("opens a related catalogue asset at a readable size", async () => {
    render(<CodexExperience data={faceData} entries={{ "crown-beard": collectedEntry }} />);
    fireEvent.click(screen.getByRole("button", { name: "查看已收录的开路将军" }));

    const trigger = await screen.findByRole("button", { name: "放大图录：开山斧" });
    fireEvent.click(trigger);
    const preview = await screen.findByRole("dialog", { name: "开山斧图录放大预览" });
    expect(preview).toBeTruthy();
    const enhanced = screen.getByRole("img", { name: "开路将军相关图录：开山斧·优化图" });
    expect(enhanced.getAttribute("src")).toContain("kaishanfu-clean.png");

    fireEvent.click(screen.getByRole("button", { name: "查看美化前的实物图" }));
    const original = screen.getByRole("img", { name: "开路将军相关图录：开山斧·实物图" });
    expect(original.getAttribute("src")).toContain("related-original");
    expect(screen.getByRole("button", { name: "返回优化后的游戏美术图" })).toBeTruthy();
  });

  test("uses the trimmed altar painting in the judge detail page", async () => {
    render(<CodexExperience data={faceData} demoMode />);
    fireEvent.change(screen.getByLabelText("演示"), { target: { value: "all" } });
    fireEvent.click(screen.getByRole("button", { name: "查看已收录的勾簿判官" }));

    await screen.findByRole("dialog", { name: "勾簿判官傩面详情" });
    const altarPainting = screen.getByRole("img", { name: "勾簿判官相关图录：傩案画" });
    expect(altarPainting.getAttribute("src")).toContain("nuo-altar-painting-clean.png");
  });
});
