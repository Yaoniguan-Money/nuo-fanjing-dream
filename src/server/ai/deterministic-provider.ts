import type { DreamCard } from "@/domain/dream-card";
import type { MatchRequest, MatchResponse } from "@/domain/dream-session";
import type { InterpretRequest, InterpretResponse } from "@/domain/interpretation";
import type { DreamAiProvider } from "./provider";

function searchableTerms(card: DreamCard): string[] {
  const match = card.meta.match;
  return [...match.tags, ...match.situations, ...match.emotions, ...match.dilemmas, ...match.relationships];
}

function scoreCard(wish: string, card: DreamCard): number {
  const direct = searchableTerms(card).reduce((score, term) => score + (wish.includes(term) ? 3 : [...term].some((character) => wish.includes(character)) ? 1 : 0), 0);
  const excluded = card.meta.match.excludeTags.some((term) => wish.includes(term)) ? 100 : 0;
  return direct - excluded;
}

export const deterministicDreamProvider: DreamAiProvider = {
  id: "deterministic-local",
  async match(request: MatchRequest, cards: DreamCard[]): Promise<MatchResponse> {
    if (cards.length === 0) throw new Error("没有可匹配的幻梦卡");
    const ranked = [...cards].sort((left, right) => scoreCard(request.wish, right) - scoreCard(request.wish, left) || left.meta.id.localeCompare(right.meta.id));
    const selected = ranked[0];
    const score = Math.max(0, scoreCard(request.wish, selected));
    return {
      schemaVersion: "1.0.0",
      cardId: selected.meta.id,
      provider: "deterministic-local",
      confidence: Math.min(.96, .62 + score * .03),
      reason: score > 0 ? `你的愿望与「${selected.meta.match.tags.slice(0, 3).join("、")}」的主题相照。` : `当前卡池中，「${selected.meta.title}」是稳定的默认入梦路径。`
    };
  },
  async interpret(request: InterpretRequest, card: DreamCard): Promise<InterpretResponse> {
    const office = card.meta.officeCandidates[0];
    return {
      schemaVersion: "1.0.0",
      cardId: card.meta.id,
      provider: "deterministic-local",
      interpretation: {
        title: `${card.meta.title} · 开路之签`,
        sign: "路并非已经存在，路由第一个愿意走进去的人显现。",
        reflection: `你所问的是“${request.wish}”。这场幻梦不替你预言结果，它借${office?.reason ?? "开路者的故事"}照见：眼下最重要的不是证明终点，而是辨认第一步。`,
        actions: ["写下一个今天即可完成、且不依赖他人许可的动作。", "确认你愿意承担的最小代价，不把全部风险一次押上。", "完成第一步后再用新事实修正下一步。"],
        boundary: "签解是叙事性反思，不是事实预测、医疗建议、法律意见或投资建议。"
      }
    };
  }
};
