"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import type { CodexCollection, CodexEntry, StorageLike } from "@/domain/codex";
import { createCodexCollection } from "@/domain/codex";
import { faceData, type FaceData, type FaceMask } from "@/domain/get-face";
import { buildCodexSlots, collectedCount, codexNumber, slotLabel, type CodexSlotView } from "./codex-model";
import { MaskReliefViewer } from "./mask-relief-viewer";
import "./codex.css";

export interface CodexExperienceProps {
  data?: FaceData;
  entries?: Record<string, CodexEntry>;
  collection?: CodexCollection;
  storage?: StorageLike;
  onRestart?: () => void;
}

type PresentationState = "empty" | "selected" | "opening" | "revealed";

function defaultStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

function codexGlyph(mask: FaceMask | null): string {
  return mask?.visual.card.glyph === "mountain" ? "⌁" : mask?.visual.card.glyph === "knot" ? "∞" : mask?.visual.card.glyph === "scale" ? "⚖" : mask?.visual.card.glyph === "lamp" ? "◉" : "?";
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function CodexCard({ slot, selected, onOpen }: { slot: CodexSlotView; selected: boolean; onOpen: (slot: CodexSlotView, trigger: HTMLButtonElement) => void }) {
  const collected = slot.state === "collected";
  const cardName = collected ? slot.entry?.role.name : "未得之面";
  return <li className={`codex-slot codex-slot-${slot.state} ${collected ? "" : "codex-slot-locked-ui"}`} data-state={collected ? "collected" : "locked"} style={{ "--card-a": slot.mask?.visual.card.primary ?? "#61594d", "--card-b": slot.mask?.visual.card.secondary ?? "#766f63" } as CSSProperties}>
    <button
      className={`codex-card ${selected ? "is-selected" : ""}`}
      type="button"
      disabled={!collected}
      aria-label={slotLabel(slot)}
      aria-pressed={collected ? selected : undefined}
      onClick={(event) => onOpen(slot, event.currentTarget)}
      onKeyDown={(event) => {
        if (collected && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onOpen(slot, event.currentTarget);
        }
      }}
    >
      <span className="codex-card-back">
        {collected && slot.mask?.artwork?.card ? <Image className="codex-card-mask" src={slot.mask.artwork.card} alt={`${cardName}面具卡面`} fill sizes="(max-width: 700px) 29vw, (max-width: 900px) 20vw, 14vw" /> : <span className="codex-card-glyph">{codexGlyph(slot.mask)}</span>}
        <span className="codex-card-veil" />
        <span className="codex-card-meta"><span>谱 · {codexNumber(slot.index)}</span><strong>{cardName}</strong></span>
        <span className="codex-card-state">{collected ? "已 · 获" : "锁 · 未得"}</span>
      </span>
    </button>
  </li>;
}

interface CodexDetailProps {
  data: FaceData;
  slot: CodexSlotView | null;
  presentation: PresentationState;
  stageRef: RefObject<HTMLDivElement | null>;
  copyRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

function CodexDetail({ data, slot, presentation, stageRef, copyRef, onClose }: CodexDetailProps) {
  const viewerHost = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const viewer = useRef<MaskReliefViewer | null>(null);
  const [viewerState, setViewerState] = useState<"loading" | "ready" | "fallback">("loading");
  const entry = slot?.entry ?? null;
  const mask = slot?.mask ?? null;

  useEffect(() => {
    if (slot) closeButton.current?.focus();
  }, [slot]);

  useEffect(() => {
    if (!entry || !mask || !viewerHost.current) {
      setViewerState("loading");
      return;
    }
    const instance = new MaskReliefViewer(viewerHost.current, { ...data.codex.relief, ...mask.visual.relief });
    viewer.current = instance;
    let active = true;
    setViewerState("loading");
    instance.mount(mask).then(() => {
      if (active) setViewerState("ready");
    }).catch(() => {
      if (active) setViewerState("fallback");
    });
    return () => {
      active = false;
      instance.dispose();
      if (viewer.current === instance) viewer.current = null;
    };
  }, [data.codex.relief, entry, mask]);

  const sourceKind = entry?.role.kind === "traditional_reference" ? "传统职司借鉴" : "项目新创";
  return <section className="codex-detail" data-presentation={presentation} role={slot && entry && mask ? "dialog" : "region"} aria-label={slot && entry && mask ? `${entry.role.name}傩面详情` : "面具显形台"}>
    {slot ? <button ref={closeButton} className="codex-close" type="button" onClick={onClose} aria-label="关闭傩面详情">×</button> : null}
    {!slot || !entry || !mask ? <div className="codex-empty" role="status"><span className="codex-empty-glyph" aria-hidden="true">◌</span><h2>显形台尚空</h2><p>点击已获得的面具，令它从图鉴入场。</p></div> : <>
      <div className="codex-viewer-column">
        <div className="codex-detail-num">第 {codexNumber(slot.index)} 面 · 已收录</div>
        <div ref={stageRef} className="codex-viewer-frame" data-viewer-state={viewerState}>
          <div ref={viewerHost} className="codex-viewer" aria-label="可拖动旋转的傩面浮雕" hidden={viewerState === "fallback"} />
          {viewerState === "fallback" ? <div className="codex-viewer-fallback"><Image src={mask.asset} alt={`${mask.name}原始视觉母体`} width={1086} height={1448} /><p>3D 查看不可用，已回退至原始视觉母体。</p></div> : null}
          {viewerState === "loading" ? <span className="codex-viewer-status" role="status">正在生成程序化浮雕…</span> : null}
        </div>
        <div className="codex-viewer-tools"><span>拖动旋转 · 滚轮缩放</span><button type="button" onClick={() => viewer.current?.reset()}>复位面具</button></div>
        <p className="codex-model-note">程序化 PNG 浮雕 3D · 非历史扫描模型</p>
      </div>
      <div ref={copyRef} className="codex-detail-copy">
        <header className="codex-detail-head"><div><h3>{entry.role.name}</h3><p className="codex-detail-duty">职司 · {entry.role.duty}</p></div><p>视觉母体 · {mask.name}</p></header>
        <div className="codex-detail-scroll">
          <section className="codex-detail-section"><span>职司</span><p>{sourceKind}。{entry.role.background}</p></section>
          <section className="codex-detail-section"><span>傩 · 面</span><p>{entry.visualText}</p></section>
          <section className="codex-detail-section"><span>授 · 面 · 理 · 由</span><p>{entry.reasonText}</p></section>
          <section className="codex-detail-section codex-omen"><span>签 · 解</span><p className="codex-qian">{entry.omen.qian}</p><p>{entry.omen.jie}</p></section>
          <section className="codex-detail-section"><span>溯 · 源</span><div className="codex-sources">{entry.sources.length ? entry.sources.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><strong>{source.title}</strong><small>{source.institution} · {source.accessedAt}</small><em>{source.meaning}</em><i>{source.imageRights}</i></a>) : <p>本回没有额外溯源条目。</p>}</div></section>
          <p className="codex-asset-notice">本地资产声明：{data.localAssetNotice}</p>
        </div>
      </div>
    </>}
  </section>;
}

export function CodexExperience({ data = faceData, entries: controlledEntries, collection, storage, onRestart }: CodexExperienceProps) {
  const [localEntries, setLocalEntries] = useState<Record<string, CodexEntry>>(controlledEntries ?? {});
  const [activeSlot, setActiveSlot] = useState<CodexSlotView | null>(null);
  const [presentation, setPresentation] = useState<PresentationState>("empty");
  const focusReturn = useRef<HTMLButtonElement | null>(null);
  const activeId = useRef<string | null>(null);
  const sourceRect = useRef<DOMRect | null>(null);
  const timeline = useRef<{ kill: () => void } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const browserStorage = defaultStorage();
  const codex = useMemo(() => collection ?? ((storage ?? browserStorage) ? createCodexCollection(storage ?? browserStorage!) : null), [browserStorage, collection, storage]);
  const entries = controlledEntries ?? localEntries;
  const slots = useMemo(() => buildCodexSlots(data, entries), [data, entries]);
  const count = collectedCount(slots);

  useEffect(() => {
    if (controlledEntries || !codex) return;
    const timer = window.setTimeout(() => setLocalEntries(codex.list(data.codex.storageKey)), 0);
    return () => window.clearTimeout(timer);
  }, [codex, controlledEntries, data.codex.storageKey]);

  const killPresentation = useCallback(() => {
    timeline.current?.kill();
    timeline.current = null;
    if (stageRef.current) gsap.set(stageRef.current, { clearProps: "transform,opacity" });
    if (copyRef.current) gsap.set(copyRef.current, { clearProps: "transform,opacity" });
  }, []);

  const open = useCallback((slot: CodexSlotView, trigger: HTMLButtonElement) => {
    if (!slot.entry) return;
    if (activeId.current === slot.id && (presentation === "opening" || presentation === "revealed")) return;
    killPresentation();
    activeId.current = slot.id;
    sourceRect.current = trigger.getBoundingClientRect();
    focusReturn.current = trigger;
    setActiveSlot(slot);
    setPresentation("selected");
  }, [killPresentation, presentation]);

  const close = useCallback(() => {
    killPresentation();
    activeId.current = null;
    sourceRect.current = null;
    setActiveSlot(null);
    setPresentation("empty");
    window.setTimeout(() => focusReturn.current?.focus(), 0);
  }, [killPresentation]);

  useLayoutEffect(() => {
    if (!activeSlot || !stageRef.current) return;
    const stage = stageRef.current;
    const copy = copyRef.current;
    const source = sourceRect.current;
    const target = stage.getBoundingClientRect();
    const dx = source ? source.left + source.width / 2 - (target.left + target.width / 2) : 0;
    const dy = source ? source.top + source.height / 2 - (target.top + target.height / 2) : 0;
    const reduced = prefersReducedMotion();
    gsap.set(stage, { x: dx, y: dy, scale: source ? Math.max(0.16, source.width / Math.max(target.width, 1)) : 0.3, rotateY: 180, opacity: 0.25, transformPerspective: 1000 });
    if (copy) gsap.set(copy, { y: 18, opacity: 0 });
    setPresentation("opening");
    const next = gsap.timeline({
      defaults: { ease: "power3.inOut" },
      onComplete: () => {
        timeline.current = null;
        setPresentation("revealed");
      }
    });
    next.to(stage, { x: 0, y: 0, scale: 1, rotateY: 360, opacity: 1, duration: reduced ? 0.01 : 0.72 }, 0);
    if (copy) next.to(copy, { y: 0, opacity: 1, duration: reduced ? 0.01 : 0.34, ease: "power2.out" }, reduced ? 0 : 0.52);
    timeline.current = next;
    return () => {
      next.kill();
      if (timeline.current === next) timeline.current = null;
    };
  }, [activeSlot]);

  useEffect(() => () => {
    timeline.current?.kill();
    timeline.current = null;
  }, []);

  const clear = useCallback(() => {
    if (!window.confirm("清空本机已收录的傩面与傩签？此操作无法恢复。")) return;
    codex?.clear(data.codex.storageKey);
    setLocalEntries({});
    close();
  }, [close, codex, data.codex.storageKey]);

  useEffect(() => {
    if (!activeSlot) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); close(); } };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeSlot, close]);

  return <main className="codex-experience" style={{ "--codex-altar": `url("${data.codex.altar.background}")` } as CSSProperties}>
    <header className="codex-title"><div className="codex-kicker">傩 · 谱 · 收 · 录</div><h1>面具图鉴 <span className="codex-title-count">({count} / {data.codex.slots.length})</span></h1><p>已收录的面具可翻入细看；本机只保存得面结果，不保存愿望与人像。</p></header>
    <div className="codex-actions"><p aria-live="polite">已收录 {count} / {data.codex.slots.length}</p><button type="button" onClick={clear}>清空本机收录</button></div>
    <div className="codex-layout">
      <ol className="codex-wall" aria-label="傩面图鉴">{slots.map((slot) => <CodexCard key={slot.id} slot={slot} selected={activeSlot?.id === slot.id} onOpen={open} />)}</ol>
      <CodexDetail data={data} slot={activeSlot} presentation={presentation} stageRef={stageRef} copyRef={copyRef} onClose={close} />
    </div>
    {onRestart ? <button className="codex-restart" type="button" onClick={onRestart}>再入傩门</button> : null}
  </main>;
}

export { CodexDetail, CodexCard };
