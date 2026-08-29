import abumoCardJson from "../../../content/dream-cards/dream.abumo.huang-nian-kai-huo.json";
import jiuWeiTuDiShenCardJson from "../../../content/dream-cards/dream.jiu-wei-tu-di-shen.di-jiu-tan.json";
import goubuPanguanCardJson from "../../../content/dream-cards/dream.goubu-panguan.he-ye-ji.json";
import kailuJiangjunCardJson from "../../../content/dream-cards/dream.kailu-jiangjun.du-shan-ji.json";
import liuyiCardJson from "../../../content/dream-cards/dream.liuyi.yi-xin-du-shui.json";
import saodiHeshangCardJson from "../../../content/dream-cards/dream.saodi-heshang.yu-huo-ji.json";
import tangshiTaipoCardJson from "../../../content/dream-cards/dream.tangshi-taipo.gui-zheng-ji.json";
import xianfengXiaojieCardJson from "../../../content/dream-cards/dream.xianfeng-xiaojie.yi-suo-hua.json";
import { dreamCardSchema, type DreamCard } from "./schema";

const registeredCards = [
  dreamCardSchema.parse(kailuJiangjunCardJson),
  dreamCardSchema.parse(xianfengXiaojieCardJson),
  dreamCardSchema.parse(jiuWeiTuDiShenCardJson),
  dreamCardSchema.parse(tangshiTaipoCardJson),
  dreamCardSchema.parse(saodiHeshangCardJson),
  dreamCardSchema.parse(goubuPanguanCardJson),
  dreamCardSchema.parse(abumoCardJson),
  dreamCardSchema.parse(liuyiCardJson)
] as const;
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
