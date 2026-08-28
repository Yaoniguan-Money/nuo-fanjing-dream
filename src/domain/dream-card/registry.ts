import kailuJiangjunCardJson from "../../../content/dream-cards/dream.kailu-jiangjun.du-shan-ji.json";
import { dreamCardSchema, type DreamCard } from "./schema";

const registeredCards = [dreamCardSchema.parse(kailuJiangjunCardJson)] as const;
const cardsById = new Map<string, DreamCard>(registeredCards.map((card) => [card.meta.id, card]));

export function listDreamCards(): DreamCard[] {
  return [...registeredCards].sort((left, right) => left.meta.title.localeCompare(right.meta.title, "zh-CN"));
}

export function listDreamCardIds(): string[] {
  return registeredCards.map((card) => card.meta.id);
}

export function getDreamCard(cardId: string): DreamCard | null {
  return cardsById.get(cardId) ?? null;
}

export function requireDreamCard(cardId: string): DreamCard {
  const card = getDreamCard(cardId);
  if (!card) throw new Error(`未知幻梦卡：${cardId}`);
  return card;
}
