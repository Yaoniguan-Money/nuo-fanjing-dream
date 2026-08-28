"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
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

function CodexCard({ slot, onOpen }: { slot: CodexSlotView; onOpen: (slot: CodexSlotView, trigger: HTMLButtonElement) => void }) {
  const collected = slot.state === "collected";
  const cardName = slot.entry?.role.name ?? (slot.state === "reserved" ? "待补" : "未见");
  return <li className={`codex-slot codex-slot-${slot.state}`} style={{ "--card-a": slot.mask?.visual.card.primary ?? "#61594d", "--card-b": slot.mask?.visual.card.secondary ?? "#766f63" } as React.CSSProperties}>
    <button
      className="codex-card"
      type="button"
      disabled={!collected}
      aria-label={slotLabel(slot)}
      onClick={(event) => onOpen(slot, event.currentTarget)}
      onKeyDown={(event) => {
        if (collected && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onOpen(slot, event.currentTarget);
        }
      }}
    >
      <span className="codex-card-back" aria-hidden="true"><span className="codex-card-glyph">{codexGlyph(slot.mask)}</span><span className="codex-card-meta"><span>NO.{codexNumber(slot.index)}</span><strong>{cardName}</strong></span></span>
      {slot.entry && slot.mask ? <span className="codex-card-front" aria-hidden="true"><Image src={slot.mask.asset} alt="" width={1086} height={1448} /></span> : null}
      {collected ? <span className="codex-collected-mark" aria-hidden="true">已 · 录</span> : null}
    </button>
  </li>;
}

function CodexDetail({ data, slot, onClose }: { data: FaceData; slot: CodexSlotView; onClose: () => void }) {
  const viewerHost = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const viewer = useRef<MaskReliefViewer | null>(null);
  const [viewerState, setViewerState] = useState<"loading" | "ready" | "fallback">("loading");
  const entry = slot.entry;
  const mask = slot.mask;
  useEffect(() => {
    closeButton.current?.focus();
  }, []);
  useEffect(() => {
    if (!entry || !mask || !viewerHost.current) return;
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
  if (!entry || !mask) return null;
  const sourceKind = entry.role.kind === "traditional_reference" ? "传统职司借鉴" : "项目新创";
  return <section className="codex-detail" role="dialog" aria-modal="true" aria-label={`${entry.role.name}傩面详情`}>
    <button ref={closeButton} className="codex-close" type="button" onClick={onClose} aria-label="关闭傩面详情">×</button>
    <div className="codex-viewer-column">
      <div className="codex-detail-num">第 {codexNumber(slot.index)} 面 · 已收录</div>
      <div className="codex-viewer-frame">
        <div ref={viewerHost} className="codex-viewer" aria-label="可拖动旋转的傩面浮雕" hidden={viewerState === "fallback"} />
        {viewerState === "fallback" ? <div className="codex-viewer-fallback"><Image src={mask.asset} alt={`${mask.name}原始视觉母体`} width={1086} height={1448} /><p>3D 查看不可用，已回退至原始视觉母体。</p></div> : null}
        {viewerState === "loading" ? <span className="codex-viewer-status" role="status">正在生成程序化浮雕…</span> : null}
      </div>
      <div className="codex-viewer-tools"><span>拖动旋转 · 滚轮缩放</span><button type="button" onClick={() => viewer.current?.reset()}>复位面具</button></div>
      <p className="codex-model-note">程序化 PNG 浮雕 3D · 非历史扫描模型</p>
    </div>
    <div className="codex-detail-copy">
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
  </section>;
}

export function CodexExperience({ data = faceData, entries: controlledEntries, collection, storage, onRestart }: CodexExperienceProps) {
  const [localEntries, setLocalEntries] = useState<Record<string, CodexEntry>>(controlledEntries ?? {});
  const [activeSlot, setActiveSlot] = useState<CodexSlotView | null>(null);
  const focusReturn = useRef<HTMLButtonElement | null>(null);
  const browserStorage = defaultStorage();
  const codex = useMemo(() => collection ?? ((storage ?? browserStorage) ? createCodexCollection(storage ?? browserStorage!) : null), [browserStorage, collection, storage]);
  const entries = controlledEntries ?? localEntries;
  const slots = useMemo(() => buildCodexSlots(data, entries), [data, entries]);
  const count = collectedCount(slots);

  useEffect(() => {
    if (controlledEntries) return;
    if (!codex) return;
    const timer = window.setTimeout(() => setLocalEntries(codex.list(data.codex.storageKey)), 0);
    return () => window.clearTimeout(timer);
  }, [codex, controlledEntries, data.codex.storageKey, storage]);

  const open = useCallback((slot: CodexSlotView, trigger: HTMLButtonElement) => {
    if (!slot.entry) return;
    focusReturn.current = trigger;
    setActiveSlot(slot);
  }, []);
  const close = useCallback(() => {
    setActiveSlot(null);
    window.setTimeout(() => focusReturn.current?.focus(), 0);
  }, []);
  const clear = useCallback(() => {
    if (!window.confirm("清空本机已收录的傩面与傩签？此操作无法恢复。")) return;
    codex?.clear(data.codex.storageKey);
    setLocalEntries({});
    setActiveSlot(null);
  }, [codex, data.codex.storageKey]);

  useEffect(() => {
    if (!activeSlot) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); close(); } };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeSlot, close]);

  return <main className="codex-experience" style={{ "--codex-altar": `url("${data.codex.altar.background}")` } as React.CSSProperties}>
    <header className="codex-title"><div className="codex-kicker">傩 · 谱 · 收 · 录</div><h1>面中有人，戏外有余声</h1><p>已收录的面具可翻入细看；本机只保存得面结果，不保存愿望与人像。</p></header>
    <div className="codex-actions"><p aria-live="polite">已收录 {count} / {data.masks.length}</p><button type="button" onClick={clear}>清空本机收录</button></div>
    <ol className="codex-wall" aria-label="傩面图鉴">{slots.map((slot) => <CodexCard key={slot.id} slot={slot} onOpen={open} />)}</ol>
    {activeSlot ? <CodexDetail data={data} slot={activeSlot} onClose={close} /> : null}
    {onRestart ? <button className="codex-restart" type="button" onClick={onRestart}>再入傩门</button> : null}
  </main>;
}

export { CodexDetail, CodexCard };
