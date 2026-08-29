import type { DreamCard } from "@/domain/dream-card";
import type { MatchRequest, MatchResponse } from "@/domain/dream-session";
import type { InterpretRequest, InterpretResponse } from "@/domain/interpretation";
import type { DreamAiProvider } from "./provider";

type RandomSource = () => number;

export type RankedDreamCard = {
  card: DreamCard;
  score: number;
};

const TOP_THREE_WEIGHTS = [.5, .3, .2] as const;

function searchableTerms(card: DreamCard): string[] {
  const match = card.meta.match;
  return [...match.tags, ...match.situations, ...match.emotions, ...match.dilemmas, ...match.relationships];
}

export function scoreDreamCard(wish: string, card: DreamCard): number {
  const direct = searchableTerms(card).reduce((score, term) => score + (wish.includes(term) ? 3 : 0), 0);
  const excluded = card.meta.match.excludeTags.some((term) => wish.includes(term)) ? 100 : 0;
  return direct - excluded;
}

export function rankDreamCards(wish: string, cards: DreamCard[], random: RandomSource = Math.random): RankedDreamCard[] {
  return cards
    .map((card) => ({ card, score: scoreDreamCard(wish, card), tieBreaker: random() }))
    .sort((left, right) => right.score - left.score || left.tieBreaker - right.tieBreaker || left.card.meta.id.localeCompare(right.card.meta.id))
    .map(({ card, score }) => ({ card, score }));
}

export function selectWeightedTopThree(ranked: RankedDreamCard[], random: RandomSource = Math.random): RankedDreamCard {
  if (ranked.length === 0) throw new Error("没有可匹配的幻梦卡");

  const candidates = ranked.slice(0, TOP_THREE_WEIGHTS.length);
  const weights = TOP_THREE_WEIGHTS.slice(0, candidates.length);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = random() * totalWeight;

  for (let index = 0; index < candidates.length; index += 1) {
    if (roll < weights[index]) return candidates[index];
    roll -= weights[index];
  }

  return candidates[candidates.length - 1];
}

export function createLocalDreamProvider(random: RandomSource = Math.random): DreamAiProvider {
  return {
    id: "deterministic-local",
    async match(request: MatchRequest, cards: DreamCard[]): Promise<MatchResponse> {
      const selected = selectWeightedTopThree(rankDreamCards(request.wish, cards, random), random);
      const score = Math.max(0, selected.score);
      const matchedTerms = searchableTerms(selected.card).filter((term) => request.wish.includes(term)).slice(0, 3);
      return {
        schemaVersion: "1.0.0",
        cardId: selected.card.meta.id,
        provider: "deterministic-local",
        confidence: Math.min(.96, .62 + score * .03),
        reason: matchedTerms.length > 0
          ? `你的愿望与「${matchedTerms.join("、")}」的主题相照。`
          : `当前词群尚未形成明确照应，由本地抽签选中了「${selected.card.meta.title}」。`
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
}

export const deterministicDreamProvider = createLocalDreamProvider();
