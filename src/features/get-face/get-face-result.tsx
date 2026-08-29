"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DreamCard } from "@/domain/dream-card";
import { createCodexCollection, type CodexEntryInput, type StorageLike } from "@/domain/codex";
import { getFaceData, getStoryOmen, ritualMaskById, RITUAL_MASKS, type RitualMaskBinding } from "@/domain/get-face";
import type { GetFaceRitualSession } from "@/domain/get-face/session";
import { CodexExperience } from "@/features/codex/codex-experience";
import "./get-face-result.css";

const REVEAL_ASSET: Record<string, string> = {
  "crown-beard": "/dream-assets/ui/codex/details/kailu-jiangjun/main-mask-v3.png",
  "square-crown": "/dream-assets/ui/codex/details/xianfeng-xiaojie/main-mask.png",
  "bound-hair": "/dream-assets/ui/codex/details/yabing-tudi/main-mask.png",
  "high-crown": "/dream-assets/ui/codex/details/tangshi-taipo/main-mask-v2.png",
  "gou-bu-pan-guan": "/dream-assets/ui/codex/details/gou-bu-pan-guan/main-mask.png",
  "sao-di-he-shang": "/dream-assets/ui/codex/details/sao-di-he-shang/main-mask.png",
  "liu-yi": "/dream-assets/ui/codex/details/liu-yi/main-mask.png",
  "abu-mo": "/dream-assets/ui/codex/details/abu-mo/main-mask.png"
};

function storyBinding(card: DreamCard, session: GetFaceRitualSession): RitualMaskBinding {
  return RITUAL_MASKS.find((item) => item.storyId === card.meta.id)
    ?? (session.selectedMaskId ? ritualMaskById(session.selectedMaskId) : null)
    ?? RITUAL_MASKS[session.selectedMaskIndex ?? 0]
    ?? RITUAL_MASKS[0];
}

function browserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage; } catch { return null; }
}

export function makeStoryCodexEntry(session: GetFaceRitualSession, card: DreamCard): CodexEntryInput {
  const binding = storyBinding(card, session);
  const index = getFaceData.masks.findIndex((candidate) => candidate.id === binding.maskId);
  const mask = getFaceData.masks[index] ?? getFaceData.masks[0];
  const role = { id: `office.${binding.maskId}`, name: binding.name, duty: binding.duty, signs: [mask.visual.pattern, mask.visual.emblem] };
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
  const binding = storyBinding(card, session);
  const mask = getFaceData.masks.find((candidate) => candidate.id === binding.maskId) ?? getFaceData.masks[0];
  const revealAsset = REVEAL_ASSET[mask.id] ?? mask.asset;

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
    <Link className="face-result-home ui-return-control" href="/" aria-label="返回首页">← 返回首页</Link>
    <section className="face-result-cinematic" aria-labelledby="reveal-title">
      <span className="face-result-kicker">幻 梦 已 尽 · 得 面 已 成</span>
      <div className="face-result-mask-wrap"><Image src={revealAsset} alt={`${binding.name}傩面`} width={1086} height={1448} priority /></div>
      <h1 id="reveal-title">{binding.name}</h1>
      <p className="face-result-duty">职司 · {binding.duty}</p>
      <p className="face-result-story">《{card.meta.title}》</p>
      <button type="button" className="face-result-confirm ui-primary-cta" onClick={collect} disabled={!revealed || collecting || !collection}>{collecting ? "正在归入傩谱" : "收录此面"}</button>
      {!collection ? <p className="face-result-storage-error">本机存储不可用，暂时无法收录。</p> : null}
    </section>
  </main>;
}
