"use client";

import Image from "next/image";
import { useCallback, useEffect, useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import { createDreamSession, matchResponseSchema, type MatchResponse } from "@/domain/dream-session";
import { writeDreamSession } from "@/domain/dream-session/storage";
import { getFaceData, resolveVisual } from "@/domain/get-face";
import {
  clearGetFaceRitualSession,
  createInitialGetFaceRitualSession,
  readGetFaceRitualSession,
  transitionGetFaceRitual,
  writeGetFaceRitualSession,
  type GetFaceRitualEvent,
  type GetFaceRitualSession
} from "@/domain/get-face/session";
import "./get-face-ritual.css";

const CARD_IDS = [
  "dream.kailu-jiangjun.du-shan-ji",
  "dream.xianfeng-xiaojie.yi-suo-hua",
  "dream.jiu-wei-tu-di-shen.di-jiu-tan",
  "dream.tangshi-taipo.gui-zheng-ji",
  "dream.goubu-panguan.he-ye-ji",
  "dream.saodi-heshang.yu-huo-ji",
  "dream.liuyi.yi-xin-du-shui",
  "dream.abumo.huang-nian-kai-huo"
] as const;

const MASK_TITLES = ["开路将军", "先锋小姐", "九位土地神", "唐氏太婆", "勾簿判官", "扫地和尚", "柳毅", "阿布摩"] as const;
const MASK_DUTIES = ["勇气与开始", "承愿与践行", "寻找位置", "守界与重建", "归档旧事", "清理余响", "传递真意", "荒年留种"] as const;

function reducer(state: GetFaceRitualSession, event: GetFaceRitualEvent) { return transitionGetFaceRitual(state, event); }
function maskIndexForCard(cardId: string): number { const index = CARD_IDS.indexOf(cardId as (typeof CARD_IDS)[number]); return index < 0 ? 0 : index; }

function localMatch(wish: string): MatchResponse {
  const maskIndex = resolveVisual(getFaceData, wish);
  return { schemaVersion: "1.0.0", cardId: CARD_IDS[maskIndex], provider: "deterministic-local", confidence: .72, reason: "本地演示规则已找到与此刻困惑相照的面具。" };
}

async function requestMatch(wish: string): Promise<MatchResponse> {
  try {
    const response = await fetch("/api/dream/match", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ wish }) });
    if (!response.ok) throw new Error("match unavailable");
    return matchResponseSchema.parse(await response.json());
  } catch { return localMatch(wish); }
}

export function GetFaceRitual({ onReturn }: { onReturn: () => void }) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, undefined, () => typeof window === "undefined" ? createInitialGetFaceRitualSession() : (readGetFaceRitualSession() ?? createInitialGetFaceRitualSession()));
  const [nameInput, setNameInput] = useState(state.name);
  const [wishInput, setWishInput] = useState(state.wish);
  const [error, setError] = useState("");
  const [matchReady, setMatchReady] = useState(false);

  useEffect(() => { writeGetFaceRitualSession(state); }, [state]);

  useEffect(() => {
    if (state.phase !== "matching") return;
    let active = true;
    const started = Date.now();
    void requestMatch(state.wish).then((match) => {
      const remaining = Math.max(0, 1450 - (Date.now() - started));
      window.setTimeout(() => {
        if (!active) return;
        writeDreamSession(createDreamSession(state.wish, match));
        dispatch({ type: "matchResolved", cardId: match.cardId, maskIndex: maskIndexForCard(match.cardId) });
      }, remaining);
    });
    return () => { active = false; };
  }, [state.phase, state.wish]);

  useEffect(() => {
    if (state.phase !== "mask") return;
    const timer = window.setTimeout(() => setMatchReady(true), window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 20 : 520);
    return () => window.clearTimeout(timer);
  }, [state.phase]);

  useEffect(() => {
    if (state.phase !== "wearing" || !state.cardId) return;
    const cardId = state.cardId;
    const timer = window.setTimeout(() => {
      dispatch({ type: "wearComplete" });
      router.push(`/dream/${encodeURIComponent(cardId)}`);
    }, window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 40 : 920);
    return () => window.clearTimeout(timer);
  }, [router, state.cardId, state.phase]);

  const submitName = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    if (!nameInput.trim()) return setError("请留下你的名字。");
    setError(""); dispatch({ type: "nameSubmitted", name: nameInput });
  }, [nameInput]);

  const submitWish = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    if (wishInput.trim().length < 2) return setError("请说出至少两个字的现实困惑。");
    setError(""); setMatchReady(false); dispatch({ type: "wishSubmitted", wish: wishInput });
  }, [wishInput]);

  const selected = state.selectedMaskIndex ?? 0;
  return <main className="get-face-ritual" data-phase={state.phase}>
    <div className="get-face-altar" aria-hidden="true" />
    <div className="get-face-mist" aria-hidden="true" />
    <header className="get-face-header"><small>龙 · 坛 · 请 · 面</small></header>
    <span className="get-face-brand-mark"><Image className="get-face-brand-mark-image" src="/dream-assets/brand/nuo-dream-logo-dark.png" alt="大傩幻梦品牌标识" fill sizes="(max-width: 700px) 124px, 190px" priority /></span>

    {(state.phase === "name" || state.phase === "wish") ? <section className="ritual-question" aria-live="polite">
      <span>{state.phase === "name" ? "问 · 名" : "问 · 心"}</span>
      <h1>{state.phase === "name" ? "来者何人？" : `${state.name}，此刻何事令你止步？`}</h1>
      <p>{state.phase === "name" ? "名字是你在幻梦里留下的第一道声音。" : "说出现实中最想面对的一件事，坛前会为你请出相照的一面。"}</p>
      <form className="ritual-input-panel" onSubmit={state.phase === "name" ? submitName : submitWish}>
        {state.phase === "name" ? <input aria-label="你的名字" autoFocus autoComplete="off" maxLength={80} placeholder="在此留名" value={nameInput} onChange={(event) => setNameInput(event.target.value)} /> : <textarea aria-label="现实困惑" autoFocus maxLength={280} rows={3} placeholder="例如：我害怕踏出第一步……" value={wishInput} onChange={(event) => setWishInput(event.target.value)} />}
        <button type="submit" aria-label="继续">→</button>
      </form>
      {error ? <p className="ritual-error" role="alert">{error}</p> : null}
    </section> : null}

    {(state.phase === "matching" || state.phase === "mask" || state.phase === "wearing") ? <section className="mask-match-stage" aria-live="polite">
      <div className="mask-orbit" aria-label="八面傩面正在匹配">
        {getFaceData.masks.slice(0, CARD_IDS.length).map((mask, index) => <div className={`orbit-mask orbit-mask-${index}${state.phase !== "matching" && index === selected ? " selected" : ""}${state.phase !== "matching" && index !== selected ? " dismissed" : ""}`} key={mask.id}>
          <Image src={mask.asset} alt={MASK_TITLES[index] ?? mask.name} width={1086} height={1448} priority />
        </div>)}
      </div>
      <div className="match-copy">
        <span>{state.phase === "matching" ? "识 · 惑 · 请 · 面" : "得 · 面"}</span>
        <h1>{state.phase === "matching" ? "八面寻心" : MASK_TITLES[selected]}</h1>
        <p>{state.phase === "matching" ? "面具正在围绕你的困惑旋转，等待一面停于眼前。" : `职司 · ${MASK_DUTIES[selected]}`}</p>
        {state.phase === "mask" && matchReady ? <button type="button" className="enter-dream-button" onClick={() => dispatch({ type: "enterStory" })}>入 戏</button> : null}
      </div>
      {state.phase === "wearing" ? <div className="wearing-flash" aria-hidden="true" /> : null}
    </section> : null}

    <button className="get-face-return" type="button" aria-label="返回首页" onClick={() => { clearGetFaceRitualSession(); onReturn(); }}>← 返回首页</button>
  </main>;
}
