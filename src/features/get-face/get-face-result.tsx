"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DreamCard } from "@/domain/dream-card";
import { createCodexCollection, type CodexEntryInput, type StorageLike } from "@/domain/codex";
import { getFaceData, getStoryOmen } from "@/domain/get-face";
import type { GetFaceRitualSession } from "@/domain/get-face/session";
import { CodexExperience } from "@/features/codex/codex-experience";
import type { CollectionFlightRect } from "@/features/codex/collection-flight";
import "./get-face-result.css";

const STORY_ROLES: Record<string, { id: string; name: string; duty: string; signs: string[] }> = {
  "crown-beard": { id: "kailu-jiangjun", name: "开路将军", duty: "勇气与开始", signs: ["翘冠", "长须", "开路"] },
  "square-crown": { id: "xianfeng-xiaojie", name: "先锋小姐", duty: "承愿与践行", signs: ["先锋", "承愿", "先行"] },
  "bound-hair": { id: "jiu-wei-tu-di-shen", name: "九位土地神", duty: "同辈比较与寻找位置", signs: ["社坛", "界石", "守土"] },
  "high-crown": { id: "tangshi-taipo", name: "唐氏太婆", duty: "守界与自我重建", signs: ["钥匙", "洞门", "守界"] },
  "gou-bu-pan-guan": { id: "gou-bu-pan-guan", name: "勾簿判官", duty: "归档旧事，认回自己", signs: ["官帽", "朱笔", "簿册"] },
  "sao-di-he-shang": { id: "sao-di-he-shang", name: "扫地和尚", duty: "清理事后滞留的牵挂", signs: ["圆脸", "竹帚", "尘环"] },
  "liu-yi": { id: "liu-yi", name: "柳毅", duty: "传声", signs: ["方巾", "长髭", "书信"] },
  "abu-mo": { id: "abu-mo", name: "阿布摩", duty: "在失序之后保存未来", signs: ["黑木", "白波", "种袋"] }
};

const STORY_MASK_ID: Record<string, string> = {
  "dream.kailu-jiangjun.du-shan-ji": "crown-beard",
  "dream.xianfeng-xiaojie.yi-suo-hua": "square-crown",
  "dream.jiu-wei-tu-di-shen.di-jiu-tan": "bound-hair",
  "dream.tangshi-taipo.gui-zheng-ji": "high-crown",
  "dream.goubu-panguan.he-ye-ji": "gou-bu-pan-guan",
  "dream.saodi-heshang.yu-huo-ji": "sao-di-he-shang",
  "dream.liuyi.yi-xin-du-shui": "liu-yi",
  "dream.abumo.huang-nian-kai-huo": "abu-mo"
};

const STORY_REVEAL_ASSET: Record<string, string> = {
  "crown-beard": "/dream-assets/ui/codex/details/kailu-jiangjun/main-mask-v3.png",
  "square-crown": "/dream-assets/ui/codex/details/xianfeng-xiaojie/main-mask.png",
  "bound-hair": "/dream-assets/ui/codex/details/yabing-tudi/main-mask.png",
  "high-crown": "/dream-assets/ui/codex/details/tangshi-taipo/main-mask-v2.png",
  "gou-bu-pan-guan": "/dream-assets/ui/codex/details/gou-bu-pan-guan/main-mask.png",
  "sao-di-he-shang": "/dream-assets/ui/codex/details/sao-di-he-shang/main-mask.png",
  "liu-yi": "/dream-assets/ui/codex/details/liu-yi/main-mask.png",
  "abu-mo": "/dream-assets/ui/codex/details/abu-mo/main-mask.png"
};

function storyMaskIndex(card: DreamCard, session: GetFaceRitualSession): number {
  const mappedMaskId = STORY_MASK_ID[card.meta.id];
  if (mappedMaskId) {
    const mappedIndex = getFaceData.masks.findIndex((mask) => mask.id === mappedMaskId);
    if (mappedIndex >= 0) return mappedIndex;
  }
  if (session.selectedMaskId) {
    const selectedIndex = getFaceData.masks.findIndex((mask) => mask.id === session.selectedMaskId);
    if (selectedIndex >= 0) return selectedIndex;
  }
  return session.selectedMaskIndex ?? 0;
}

function browserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage; } catch { return null; }
}

export function makeStoryCodexEntry(session: GetFaceRitualSession, card: DreamCard): CodexEntryInput {
  const index = storyMaskIndex(card, session);
  const mask = getFaceData.masks[index] ?? getFaceData.masks[0];
  const role = STORY_ROLES[mask.id] ?? STORY_ROLES["crown-beard"];
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
  const [sourceRect, setSourceRect] = useState<CollectionFlightRect | null>(null);
  const maskRef = useRef<HTMLDivElement>(null);
  const localStorage = browserStorage();
  const collection = useMemo(() => (storage ?? localStorage) ? createCodexCollection((storage ?? localStorage)!) : null, [localStorage, storage]);
  const entry = useMemo(() => makeStoryCodexEntry(session, card), [card, session]);
  const index = storyMaskIndex(card, session);
  const mask = getFaceData.masks[index] ?? getFaceData.masks[0];
  const role = STORY_ROLES[mask.id] ?? STORY_ROLES["crown-beard"];
  const revealAsset = STORY_REVEAL_ASSET[mask.id] ?? mask.asset;

  useEffect(() => {
    const timer = window.setTimeout(() => setRevealed(true), 60);
    return () => window.clearTimeout(timer);
  }, []);

  const collect = useCallback(() => {
    if (!collection || collecting) return;
    const saved = collection.upsert(getFaceData.codex.storageKey, entry);
    if (!saved.ok) return;
    const rect = maskRef.current?.getBoundingClientRect();
    setSourceRect(rect ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null);
    setCollecting(true);
    setShowCodex(true);
  }, [collecting, collection, entry]);

  if (showCodex) return <CodexExperience collection={collection ?? undefined} newlyCollectedMaskId={mask.id} collectionArrival={sourceRect ? { maskId: mask.id, asset: revealAsset, sourceRect } : undefined} onRestart={onRestart} demoMode />;

  return <main className="face-result-page" data-revealed={revealed} data-collecting={collecting}>
    <Link className="face-result-home ui-return-control" href="/" aria-label="返回首页">← 返回首页</Link>
    <section className="face-result-cinematic" aria-labelledby="reveal-title">
      <span className="face-result-kicker">幻 梦 已 尽 · 得 面 已 成</span>
      <div ref={maskRef} className="face-result-mask-wrap"><Image src={revealAsset} alt={`${role.name}傩面`} width={1086} height={1448} priority /></div>
      <h1 id="reveal-title">{role.name}</h1>
      <p className="face-result-duty">职司 · {role.duty}</p>
      <p className="face-result-story">《{card.meta.title}》</p>
      <button type="button" className="face-result-confirm ritual-hanging-cta ritual-hanging-cta--collect" onClick={collect} disabled={!revealed || collecting || !collection}>{collecting ? "正在归入傩谱" : "收录此面"}</button>
      {!collection ? <p className="face-result-storage-error">本机存储不可用，暂时无法收录。</p> : null}
    </section>
  </main>;
}
