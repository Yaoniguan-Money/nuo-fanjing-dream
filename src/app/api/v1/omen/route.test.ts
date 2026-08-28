import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { clearOmenCache } from "@/server/ai/omen-provider";

const validPayload = {
  request_id: "route-test",
  wish: "我想为前路找到一个可承担的开始",
  choices: [0, 1, 0],
  role: { id: "path-general", name: "开路将军", duty: "开障引路", reason: "为下一步辨路", kind: "traditional_reference" },
  evidence: { signs: ["山纹", "路印"] }
};

function request(body: unknown): Request {
  return new Request("http://localhost/api/v1/omen", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

afterEach(() => {
  clearOmenCache();
  vi.unstubAllGlobals();
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.DEEPSEEK_BASE_URL;
  delete process.env.DEEPSEEK_MODEL;
});

describe("POST /api/v1/omen", () => {
  it("returns stable validation errors without calling upstream", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(request({ ...validPayload, choices: [0, 1] }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "INVALID_REQUEST" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 503 when DeepSeek is not configured", async () => {
    const response = await POST(request(validPayload));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "AI_NOT_CONFIGURED" });
  });

  it("rejects a body over the server limit", async () => {
    const response = await POST(request({ ...validPayload, wish: "愿".repeat(9_000) }));
    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({ code: "INVALID_REQUEST" });
  });
});
