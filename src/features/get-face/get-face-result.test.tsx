// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { requireDreamCard } from "@/domain/dream-card";
import type { GetFaceRitualSession } from "@/domain/get-face/session";
import { GetFaceResult, makeStoryCodexEntry } from "./get-face-result";

vi.mock("@/features/codex/codex-experience", () => ({
  CodexExperience: ({ demoMode }: { demoMode?: boolean }) => <main data-demo-mode={String(Boolean(demoMode))}>傩谱已打开</main>
}));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const card = requireDreamCard("dream.kailu-jiangjun.du-shan-ji");
const session: GetFaceRitualSession = { schemaVersion: "2.0.0", phase: "complete", name: "阿渡", wish: "我想找到一条路", selectedMaskIndex: 0, cardId: card.meta.id };

function storage() {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
}

describe("story-backed mask reveal", () => {
  it("builds the codex entry only from the authoritative story and contains no independent qian/jie source", () => {
    const entry = makeStoryCodexEntry(session, card);
    expect(entry.role?.name).toBe("开路将军");
    expect(entry.omen?.qian).toBe("斧落千嶂裂，人行万径开");
    expect(entry.omen?.interpretation).toContain("山石不会自己裂开");
    expect(JSON.stringify(entry)).not.toContain(session.wish);
  });

  it("uses the completed story as the authoritative mask even when the old ritual session points elsewhere", () => {
    const staleSession = { ...session, selectedMaskIndex: 2, cardId: "dream.jiu-wei-tu-di-shen.di-jiu-tan" } as GetFaceRitualSession;
    const entry = makeStoryCodexEntry(staleSession, card);
    expect(entry.mask?.id).toBe("crown-beard");
    expect(entry.role?.name).toBe("开路将军");
  });

  it("collects on explicit confirmation, then enters the codex without any network request", async () => {
    const local = storage();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<GetFaceResult session={session} card={card} storage={local} onRestart={vi.fn()} />);
    expect(screen.getByRole("link", { name: "返回首页" }).getAttribute("href")).toBe("/");
    const collect = screen.getByRole("button", { name: "收录此面" });
    await waitFor(() => expect((collect as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(collect);
    const codex = await screen.findByText("傩谱已打开", {}, { timeout: 2000 });
    expect(codex.getAttribute("data-demo-mode")).toBe("true");
    expect(local.values.get("nuo.codex.v2")).toContain("开路将军");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
