import { describe, expect, it } from "vitest";
import { getDreamCard, listDreamCards } from "@/domain/dream-card";
import { matchResponseSchema } from "@/domain/dream-session";
import { interpretResponseSchema } from "@/domain/interpretation";
import { deterministicDreamProvider } from "./deterministic-provider";

describe("deterministic local dream provider", () => {
  it("returns the same registered card for the same wish", async () => {
    const request = { wish: "我对未来很迷茫，想找到开始行动的路" };
    const first = matchResponseSchema.parse(await deterministicDreamProvider.match(request, listDreamCards()));
    const second = matchResponseSchema.parse(await deterministicDreamProvider.match(request, listDreamCards()));
    expect(first).toEqual(second);
    expect(getDreamCard(first.cardId)).not.toBeNull();
  });

  it("interprets only an authoritative registered card", async () => {
    const card = listDreamCards()[0];
    const response = interpretResponseSchema.parse(await deterministicDreamProvider.interpret({ cardId: card.meta.id, wish: "我想开始一个困难项目" }, card));
    expect(response.cardId).toBe(card.meta.id);
    expect(response.interpretation.actions).toHaveLength(3);
  });
});
