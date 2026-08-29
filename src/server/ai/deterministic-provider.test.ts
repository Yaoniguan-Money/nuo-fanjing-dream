import { describe, expect, it } from "vitest";
import { getDreamCard, listDreamCards } from "@/domain/dream-card";
import { matchResponseSchema } from "@/domain/dream-session";
import { interpretResponseSchema } from "@/domain/interpretation";
import {
  deterministicDreamProvider,
  rankDreamCards,
  scoreDreamCard,
  selectWeightedTopThree
} from "./deterministic-provider";

const NATURAL_WISH_CASES = [
  ["dream.kailu-jiangjun.du-shan-ji", "我想换工作，但不知道第一步该做什么"],
  ["dream.kailu-jiangjun.du-shan-ji", "所有人都觉得这件事不可能，我还要开始吗"],
  ["dream.kailu-jiangjun.du-shan-ji", "眼前没有现成的路，我该怎么迈出第一步"],
  ["dream.xianfeng-xiaojie.yi-suo-hua", "我一直想学画画，但没有钱也没有老师"],
  ["dream.xianfeng-xiaojie.yi-suo-hua", "这是我真正喜欢的事，可现实条件一直不允许"],
  ["dream.xianfeng-xiaojie.yi-suo-hua", "热爱的事情做了一半，我快坚持不下去了"],
  ["dream.goubu-panguan.he-ye-ji", "工作、家庭和自己同时拉扯我，我不知道先做谁"],
  ["dream.goubu-panguan.he-ye-ji", "我扮演了太多角色，已经不知道哪个才是我"],
  ["dream.goubu-panguan.he-ye-ji", "答应每个人以后，我发现自己谁都辜负了"],
  ["dream.jiu-wei-tu-di-shen.di-jiu-tan", "想做的事情太多，精力应该放在哪一件上"],
  ["dream.jiu-wei-tu-di-shen.di-jiu-tan", "我每天很忙，却总没有推进最重要的目标"],
  ["dream.jiu-wei-tu-di-shen.di-jiu-tan", "事业、学习和副业都想要，我该怎么排优先级"],
  ["dream.tangshi-taipo.gui-zheng-ji", "别人一句评价就让我怀疑自己的选择"],
  ["dream.tangshi-taipo.gui-zheng-ji", "父母总替我决定，我怎样守住自己的边界"],
  ["dream.tangshi-taipo.gui-zheng-ji", "我总是在迎合别人，已经听不见自己的想法"],
  ["dream.liuyi.yi-xin-du-shui", "我遇到了困难，却不好意思向朋友求助"],
  ["dream.liuyi.yi-xin-du-shui", "有些话憋了很久，我怎样才能说出口"],
  ["dream.liuyi.yi-xin-du-shui", "我需要支持，但害怕开口以后被拒绝"],
  ["dream.saodi-heshang.yu-huo-ji", "事情过去很久了，我还是无法停止自责"],
  ["dream.saodi-heshang.yu-huo-ji", "一段关系已经结束，可我每天还在反复回想"],
  ["dream.saodi-heshang.yu-huo-ji", "错误已经补救了，我却觉得自己不配轻松"],
  ["dream.abumo.huang-nian-kai-huo", "经历重大失败后，我不知道生活还有什么意义"],
  ["dream.abumo.huang-nian-kai-huo", "一切都毁了，我该怎样重新开始生活"],
  ["dream.abumo.huang-nian-kai-huo", "我想不明白人生答案，所以什么也做不了"]
] as const;

describe("local dream provider", () => {
  it("matches complete short terms without single-character fuzzy scoring", () => {
    const card = getDreamCard("dream.kailu-jiangjun.du-shan-ji");
    expect(card).not.toBeNull();
    expect(scoreDreamCard("环境", card!)).toBe(0);
    expect(scoreDreamCard("我不知道第一步怎么走", card!)).toBeGreaterThan(0);
  });

  it.each(NATURAL_WISH_CASES)("keeps %s in the top three for %s", (expectedCardId, wish) => {
    const ranked = rankDreamCards(wish, listDreamCards(), () => .5);
    expect(ranked.find(({ card }) => card.meta.id === expectedCardId)?.score).toBeGreaterThan(0);
    expect(ranked.slice(0, 3).map(({ card }) => card.meta.id)).toContain(expectedCardId);
  });

  it("selects the top three with 50/30/20 boundaries", () => {
    const ranked = rankDreamCards("我不知道第一步怎么迈出", listDreamCards(), () => .5);
    expect(selectWeightedTopThree(ranked, () => .499_999)).toBe(ranked[0]);
    expect(selectWeightedTopThree(ranked, () => .5)).toBe(ranked[1]);
    expect(selectWeightedTopThree(ranked, () => .799_999)).toBe(ranked[1]);
    expect(selectWeightedTopThree(ranked, () => .8)).toBe(ranked[2]);
    expect(selectWeightedTopThree(ranked, () => .999_999)).toBe(ranked[2]);
  });

  it("randomizes equal-score order instead of falling back to card ids", () => {
    const cards = listDreamCards();
    let ascending = 0;
    let descending = 1;
    const first = rankDreamCards("量子芯片", cards, () => (ascending += .1));
    const second = rankDreamCards("量子芯片", cards, () => (descending -= .1));
    expect(first.every(({ score }) => score === 0)).toBe(true);
    expect(first.map(({ card }) => card.meta.id)).not.toEqual(second.map(({ card }) => card.meta.id));
  });

  it("returns a registered card through the API provider contract", async () => {
    const response = matchResponseSchema.parse(await deterministicDreamProvider.match({ wish: "我想找到开始行动的方向" }, listDreamCards()));
    expect(getDreamCard(response.cardId)).not.toBeNull();
  });

  it("interprets only an authoritative registered card", async () => {
    const card = listDreamCards()[0];
    const response = interpretResponseSchema.parse(await deterministicDreamProvider.interpret({ cardId: card.meta.id, wish: "我想开始一个困难项目" }, card));
    expect(response.cardId).toBe(card.meta.id);
    expect(response.interpretation.actions).toHaveLength(3);
  });
});
