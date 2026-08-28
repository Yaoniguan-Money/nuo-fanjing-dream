import { describe, expect, it } from "vitest";
import { listDreamCardIds } from "@/domain/dream-card";
import { matchResponseSchema } from "@/domain/dream-session";
import { interpretResponseSchema } from "@/domain/interpretation";
import { POST as match } from "./match/route";
import { POST as interpret } from "./interpret/route";

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

describe("dream route handlers", () => {
  it("matches only to a registered card and returns the frozen response shape", async () => {
    const response = await match(jsonRequest({ wish: "我想从迷茫里找到一条路" }));
    expect(response.status).toBe(200);
    const body = matchResponseSchema.parse(await response.json());
    expect(listDreamCardIds()).toContain(body.cardId);
  });

  it("rejects client-uploaded card data", async () => {
    const response = await interpret(jsonRequest({ cardId: listDreamCardIds()[0], wish: "我想开始行动", card: { data: { acts: [] } } }));
    expect(response.status).toBe(400);
  });

  it("returns 404 for an unknown card instead of trusting the client", async () => {
    const response = await interpret(jsonRequest({ cardId: "dream.client.fabricated", wish: "我想开始行动" }));
    expect(response.status).toBe(404);
  });

  it("returns a valid deterministic interpretation for an authoritative card", async () => {
    const cardId = listDreamCardIds()[0];
    const response = await interpret(jsonRequest({ cardId, wish: "我想开始行动" }));
    expect(response.status).toBe(200);
    expect(interpretResponseSchema.parse(await response.json()).cardId).toBe(cardId);
  });
});
