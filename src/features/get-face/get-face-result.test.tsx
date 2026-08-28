// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { faceData } from "@/domain/get-face";
import type { GetFaceRitualSession } from "@/domain/get-face/session";
import { makeGetFaceCodexEntry, resolveGetFaceResult, GetFaceResult } from "./get-face-result";

vi.mock("@/features/codex/codex-experience", () => ({
  CodexExperience: () => <main>傩谱已打开</main>
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const session: GetFaceRitualSession = {
  schemaVersion: "1.0.0",
  phase: "complete",
  name: "阿渡",
  wish: "我想找到一条路",
  portraitMode: "silhouette",
  selectedMaskIndex: 0,
  choices: [0, 1, 0],
  storyIndex: 3
};

const interpretation = {
  title: "开路之签",
  sign: "路由第一个愿意走进去的人显现。",
  reflection: "这是确定性解读。",
  actions: ["写下第一步。"],
  boundary: "这是叙事性反思。"
};

function storage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); }
  };
}

describe("get-face cinematic result", () => {
  it("resolves a stable face and sends only the omen contract", async () => {
    const result = resolveGetFaceResult(session);
    expect(result.role.id).toBe("path-general");
    expect(result.mask.id).toBe("crown-beard");
    expect(resolveGetFaceResult(session).variant).toEqual(result.variant);

    const response = { qian: "前路有光且可承担", jie: "先辨来路再将第一步放回自己的掌中。", meta: { model: "hidden", request_id: "hidden" } };
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body).toEqual({
        wish: session.wish,
        choices: [0, 1, 0],
        role: { id: "path-general", name: "开路将军", duty: "开障引路", reason: "你在山门前没有把脚步交给黑暗，仍在为下一步辨路。", kind: "traditional_reference" },
        evidence: { mask_id: "crown-beard", signs: ["翘冠", "山纹", "路印"], prompt_version: faceData.promptVersion }
      });
      return new Response(JSON.stringify(response), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const local = storage();
    render(<GetFaceResult session={session} interpretation={interpretation} storage={local} onRestart={vi.fn()} />);
    expect(await screen.findByText("前路有光且可承担")).toBeTruthy();
    expect(screen.getByText("开路之签")).toBeTruthy();
    expect(screen.getByRole("button", { name: "确认此面，入傩谱" })).toBeTruthy();
    expect(local.values.get("nuo.codex.v2") ?? "").not.toMatch(/我想找到一条路|portrait|meta|request_id/i);
  });

  it("shows an explicit local fallback when the omen service is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ code: "AI_NOT_CONFIGURED", message: "本地服务尚未配置 DeepSeek API Key。" }), { status: 503 })));
    render(<GetFaceResult session={session} interpretation={interpretation} storage={storage()} onRestart={vi.fn()} />);
    expect(await screen.findByText(/已降级为本地确定性解读/)).toBeTruthy();
    expect(screen.getAllByText("这是确定性解读。").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "重新求签" })).toBeTruthy();
  });

  it("builds a codex entry without transient wish or API metadata", () => {
    const entry = makeGetFaceCodexEntry(resolveGetFaceResult(session), { status: "ready", qian: "前路有光且可承担", jie: "傩解", meta: { request_id: "secret" } });
    expect(entry).not.toHaveProperty("wish");
    expect(entry.omen).toEqual({ status: "ready", qian: "前路有光且可承担", jie: "傩解" });
    expect(JSON.stringify(entry)).not.toContain("secret");
  });
});
