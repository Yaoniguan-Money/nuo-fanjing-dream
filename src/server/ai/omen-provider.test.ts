import { afterEach, describe, expect, it, vi } from "vitest";
import { clearOmenCache, generateOmen, validateOmen, validateOmenInput, OmenError } from "./omen-provider";

const context = {
  wish: "我想为前路找到一个可承担的开始",
  choices: [0, 1, 0] as [0, 1, 0],
  role: { id: "path-general", name: "开路将军", duty: "开障引路", reason: "为下一步辨路", kind: "traditional_reference" },
  evidence: { signs: ["山纹", "路印"] },
  request_id: "test-omen"
};

function upstreamResponse(text: string): Response {
  return new Response(JSON.stringify({ output_text: text }), { status: 200, headers: { "content-type": "application/json" } });
}

afterEach(() => {
  clearOmenCache();
  vi.unstubAllGlobals();
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.DEEPSEEK_BASE_URL;
  delete process.env.DEEPSEEK_MODEL;
});

describe("DeepSeek omen provider", () => {
  it("validates the upstream omen constraints", () => {
    expect(validateOmen({ qian: "心灯未灭前路自开", jie: "愿".repeat(70) }).qian).toBe("心灯未灭前路自开");
    expect(() => validateOmen({ qian: "心灯未灭，前路自开", jie: "愿".repeat(70) })).toThrowError(new OmenError("AI_INVALID_QIAN", "傩签未满足八至十二个汉字的格式。"));
    expect(() => validateOmen({ qian: "心灯未灭前路自开", jie: `${"愿".repeat(70)}一定会` })).toThrowError("傩解出现了不适合本体验的承诺或建议。");
  });

  it("calls DeepSeek with server configuration and repairs one invalid result", async () => {
    process.env.DEEPSEEK_API_KEY = "server-only-test-key";
    process.env.DEEPSEEK_BASE_URL = "https://example.test";
    process.env.DEEPSEEK_MODEL = "test-model";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(upstreamResponse(JSON.stringify({ qian: "太短", jie: "愿".repeat(70) })))
      .mockResolvedValueOnce(upstreamResponse(JSON.stringify({ qian: "心灯未灭前路自开", jie: "愿".repeat(70) })));
    vi.stubGlobal("fetch", fetchMock);
    const result = await generateOmen(context);
    expect(result.qian).toBe("心灯未灭前路自开");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe("https://example.test/responses");
    expect(fetchMock.mock.calls[1][1]?.body).toContain("repair_note");
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ Authorization: "Bearer server-only-test-key" });
  });

  it("does not call the network when the key is not configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(generateOmen(context)).rejects.toMatchObject({ code: "AI_NOT_CONFIGURED", status: 503 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires three binary choices and role/evidence context", () => {
    expect(() => validateOmenInput({ ...context, choices: [0, 1] })).toThrowError("愿望、三幕选择、职司或授面证据不完整。");
    expect(() => validateOmenInput({ ...context, role: { id: "path-general" } })).toThrowError("愿望、三幕选择、职司或授面证据不完整。");
    expect(() => validateOmenInput({ ...context, evidence: {} })).toThrowError("愿望、三幕选择、职司或授面证据不完整。");
  });
});
