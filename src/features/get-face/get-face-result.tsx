"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DreamCard } from "@/domain/dream-card";
import { createCodexCollection, type CodexEntryInput, type StorageLike } from "@/domain/codex";
import { getFaceData, getStoryOmen } from "@/domain/get-face";
import type { GetFaceRitualSession } from "@/domain/get-face/session";
import { CodexExperience } from "@/features/codex/codex-experience";
import "./get-face-result.css";

const STORY_ROLES = [
  { id: "kailu-jiangjun", name: "开路将军", duty: "勇气与开始", signs: ["翘冠", "长须", "开路"] },
  { id: "xianfeng-xiaojie", name: "先锋小姐", duty: "建立边界、拒绝强迫", signs: ["先锋", "绳桥", "先行"] },
  { id: "jiu-wei-tu-di-shen", name: "九位土地神", duty: "同辈比较与寻找位置", signs: ["社坛", "界石", "守土"] },
  { id: "tangshi-taipo", name: "唐氏太婆", duty: "被否定后的自我重建", signs: ["白布面", "织锦", "归魂"] }
] as const;

const STORY_MASK_INDEX: Record<string, number> = {
  "dream.kailu-jiangjun.du-shan-ji": 0,
  "dream.xianfeng-xiaojie.qian-jie-qiao": 1,
  "dream.jiu-wei-tu-di-shen.di-jiu-tan": 2,
  "dream.tangshi-taipo.zhi-hun-ji": 3
};

const STORY_REVEAL_ASSET: Record<string, string> = {
  "dream.kailu-jiangjun.du-shan-ji": "/dream-assets/ui/codex/details/kailu-jiangjun/main-mask-v3.png",
  "dream.xianfeng-xiaojie.qian-jie-qiao": "/dream-assets/ui/codex/details/xianfeng-xiaojie/main-mask.png",
  "dream.jiu-wei-tu-di-shen.di-jiu-tan": "/dream-assets/ui/codex/details/yabing-tudi/main-mask.png",
  "dream.tangshi-taipo.zhi-hun-ji": "/dream-assets/ui/codex/details/tangshi-taipo/main-mask.png"
};

function storyMaskIndex(card: DreamCard, session: GetFaceRitualSession): number {
  return STORY_MASK_INDEX[card.meta.id] ?? session.selectedMaskIndex ?? 0;
}

function browserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage; } catch { return null; }
}

export function makeStoryCodexEntry(session: GetFaceRitualSession, card: DreamCard): CodexEntryInput {
  const index = storyMaskIndex(card, session);
  const mask = getFaceData.masks[index] ?? getFaceData.masks[0];
  const role = STORY_ROLES[index] ?? STORY_ROLES[0];
  const office = card.meta.officeCandidates[0];
  const omen = getStoryOmen(card.meta.id);
  return {
    mask,
    role: { ...role, kind: "traditional_reference", background: card.meta.synopsis },
    variant: { seed: index + 1, ...mask.visual },
    visualText: `傩面对应历史角色「${role.name}」，在本次幻梦中承担「${role.duty}」的现实映照。`,
    reasonText: office?.reason ?? card.meta.synopsis,
    sources: getFaceData.sources,
    omen: omen ? { status: "story", qian: omen.qian, jie: omen.interpretation, grade: omen.grade, interpretation: omen.interpretation, reflection: omen.reflection } : { status: "story", qian: card.meta.title, jie: "傩解尚未收录。" }
  };
}

export function GetFaceResult({ session, card, storage, onRestart }: { session: GetFaceRitualSession; card: DreamCard; storage?: StorageLike; onRestart: () => void }) {
  const [revealed, setRevealed] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [showCodex, setShowCodex] = useState(false);
  const localStorage = browserStorage();
  const collection = useMemo(() => (storage ?? localStorage) ? createCodexCollection((storage ?? localStorage)!) : null, [localStorage, storage]);
  const entry = useMemo(() => makeStoryCodexEntry(session, card), [card, session]);
  const index = storyMaskIndex(card, session);
  const mask = getFaceData.masks[index] ?? getFaceData.masks[0];
  const role = STORY_ROLES[index] ?? STORY_ROLES[0];
  const revealAsset = STORY_REVEAL_ASSET[card.meta.id] ?? mask.asset;

  useEffect(() => {
    const timer = window.setTimeout(() => setRevealed(true), 60);
    return () => window.clearTimeout(timer);
  }, []);

  const collect = useCallback(() => {
    if (!collection || collecting) return;
    const saved = collection.upsert(getFaceData.codex.storageKey, entry);
    if (!saved.ok) return;
    setCollecting(true);
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    window.setTimeout(() => setShowCodex(true), reduced ? 30 : 920);
  }, [collecting, collection, entry]);

  if (showCodex) return <CodexExperience collection={collection ?? undefined} newlyCollectedMaskId={mask.id} onRestart={onRestart} demoMode />;

  return <main className="face-result-page" data-revealed={revealed} data-collecting={collecting}>
    <div className="face-result-rays" aria-hidden="true" />
    <Link className="face-result-home" href="/" aria-label="返回首页">← 返回首页</Link>
    <section className="face-result-cinematic" aria-labelledby="reveal-title">
      <span className="face-result-kicker">幻 梦 已 尽 · 得 面 已 成</span>
      <div className="face-result-mask-wrap"><Image src={revealAsset} alt={`${role.name}傩面`} width={1086} height={1448} priority /></div>
      <h1 id="reveal-title">{role.name}</h1>
      <p className="face-result-duty">职司 · {role.duty}</p>
      <p className="face-result-story">《{card.meta.title}》</p>
      <button type="button" className="face-result-confirm" onClick={collect} disabled={!revealed || collecting || !collection}>{collecting ? "正在归入傩谱" : "收录此面"}</button>
      {!collection ? <p className="face-result-storage-error">本机存储不可用，暂时无法收录。</p> : null}
    </section>
  </main>;
}
