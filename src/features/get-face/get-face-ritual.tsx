"use client";

import Image from "next/image";
import gsap from "gsap";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createDreamSession, matchResponseSchema, type MatchResponse } from "@/domain/dream-session";
import { writeDreamSession } from "@/domain/dream-session/storage";
import { clearDreamSession } from "@/domain/dream-session/storage";
import { getFaceData, resolveRitualTarget, resolveVisual, ritualMaskById, RITUAL_MASKS } from "@/domain/get-face";
import {
  clearGetFaceRitualSession,
  createInitialGetFaceRitualSession,
  createWishEntryGetFaceRitualSession,
  readGetFaceRitualSession,
  transitionGetFaceRitual,
  writeGetFaceRitualSession,
  type GetFaceRitualEvent,
  type GetFaceRitualSession
} from "@/domain/get-face/session";
import "./get-face-ritual.css";

const RESULT_RING_SLOTS = [
  ["0vw", "-24vh"], ["21vw", "-17vh"], ["31vw", "0vh"], ["21vw", "17vh"],
  ["0vw", "24vh"], ["-21vw", "17vh"], ["-31vw", "0vh"], ["-21vw", "-17vh"]
] as const;

function reducer(state: GetFaceRitualSession, event: GetFaceRitualEvent) { return transitionGetFaceRitual(state, event); }
function localMatch(wish: string): MatchResponse {
  const playable = RITUAL_MASKS.filter((item) => item.storyId);
  const resolved = getFaceData.masks[resolveVisual(getFaceData, wish)];
  const target = playable.find((item) => item.maskId === resolved?.id) ?? playable[Math.abs([...wish].reduce((sum, character) => sum + character.charCodeAt(0), 0)) % playable.length];
  return { schemaVersion: "1.0.0", cardId: target.storyId!, maskId: target.maskId, provider: "deterministic-local", confidence: .72, reason: "本地演示规则已找到与此刻困惑相照的面具。" };
}

async function requestMatch(wish: string): Promise<MatchResponse> {
  try {
    const response = await fetch("/api/dream/match", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ wish }) });
    if (!response.ok) throw new Error("match unavailable");
    return matchResponseSchema.parse(await response.json());
  } catch { return localMatch(wish); }
}

export function GetFaceRitual({ entryMode = "default", onReturn }: { entryMode?: "default" | "wish"; onReturn: () => void }) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, entryMode, (mode) => {
    if (typeof window === "undefined") return createInitialGetFaceRitualSession();
    const previous = readGetFaceRitualSession();
    return mode === "wish" ? createWishEntryGetFaceRitualSession(previous) : (previous ?? createInitialGetFaceRitualSession());
  });
  const [nameInput, setNameInput] = useState(state.name);
  const [wishInput, setWishInput] = useState(state.wish);
  const [error, setError] = useState("");
  const [matchReady, setMatchReady] = useState(false);
  const orbitRef = useRef<HTMLDivElement>(null);
  const orbitMaskRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => { writeGetFaceRitualSession(state); }, [state]);

  useEffect(() => {
    if (entryMode === "wish") clearDreamSession();
  }, [entryMode]);

  useEffect(() => {
    if (state.phase !== "matching") return;
    let active = true;
    const started = Date.now();
    void requestMatch(state.wish).then((match) => {
      const remaining = Math.max(0, 2400 - (Date.now() - started));
      window.setTimeout(() => {
        if (!active) return;
        writeDreamSession(createDreamSession(state.wish, match));
        const target = resolveRitualTarget(match);
        if (!target) return setError("这段幻梦尚未与傩面建立对应，请返回重试。");
        dispatch({ type: "matchResolved", cardId: match.cardId, maskId: target.maskId });
      }, remaining);
    });
    return () => { active = false; };
  }, [state.phase, state.wish]);

  useEffect(() => {
    if (state.phase !== "mask") return;
    const timer = window.setTimeout(() => setMatchReady(true), window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 20 : 800);
    return () => window.clearTimeout(timer);
  }, [state.phase]);

  useEffect(() => {
    if (state.phase !== "wearing" || !state.cardId) return;
    const cardId = state.cardId;
    const timer = window.setTimeout(() => {
      dispatch({ type: "wearComplete" });
      router.push(`/dream/${encodeURIComponent(cardId)}`);
    }, window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 40 : 1320);
    return () => window.clearTimeout(timer);
  }, [router, state.cardId, state.phase]);

  useLayoutEffect(() => {
    if (state.phase !== "matching") return;
    const orbit = orbitRef.current;
    const masks = orbitMaskRefs.current.filter((node): node is HTMLDivElement => Boolean(node));
    if (!orbit || masks.length === 0) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const startedAt = performance.now();
    const paintOrbit = () => {
      const bounds = orbit.getBoundingClientRect();
      const radiusX = Math.max(210, Math.min(520, bounds.width * .42));
      const radiusY = Math.max(58, Math.min(128, bounds.height * .18));
      const elapsed = reduced ? 0 : performance.now() - startedAt;

      masks.forEach((node, index) => {
        const angle = (index / masks.length) * Math.PI * 2 + elapsed * .00024;
        const depth = (Math.cos(angle) + 1) / 2;
        gsap.set(node, {
          xPercent: -50,
          yPercent: -50,
          x: Math.sin(angle) * radiusX,
          y: Math.cos(angle) * radiusY - 72,
          scale: .54 + depth * .58,
          zIndex: Math.round(10 + depth * 90),
          opacity: .4 + depth * .6,
          filter: `blur(${((1 - depth) * 1.8).toFixed(2)}px) brightness(${(.68 + depth * .42).toFixed(2)}) drop-shadow(0 24px 32px rgba(0,0,0,.68))`
        });
      });
    };

    paintOrbit();
    if (!reduced) gsap.ticker.add(paintOrbit);
    return () => {
      gsap.ticker.remove(paintOrbit);
      gsap.set(masks, { clearProps: "x,y,xPercent,yPercent,scale,zIndex,opacity,filter" });
    };
  }, [state.phase]);

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

  const selectedBinding = state.selectedMaskId ? ritualMaskById(state.selectedMaskId) : null;
  return <main className="get-face-ritual" data-phase={state.phase}>
    <div className="get-face-altar" aria-hidden="true" />
    <div className="get-face-mist" aria-hidden="true" />
    <header className="get-face-header"><small>龙 · 坛 · 请 · 面</small></header>
    {(state.phase === "name" || state.phase === "wish") ? <section className="ritual-question" aria-live="polite">
      <span>{state.phase === "name" ? "问 · 名" : "问 · 心"}</span>
      <h1>{state.phase === "name" ? "来者何人？" : `${state.name}，此刻何事令你止步？`}</h1>
      <p>{state.phase === "name" ? "名字是你在幻梦里留下的第一道声音。" : "说出现实中最想面对的一件事，坛前会为你请出相照的一面。"}</p>
      <form className="ritual-input-panel" onSubmit={state.phase === "name" ? submitName : submitWish}>
        {state.phase === "name" ? <input aria-label="你的名字" autoFocus autoComplete="off" maxLength={80} placeholder="在此留名" value={nameInput} onChange={(event) => setNameInput(event.target.value)} /> : <textarea aria-label="现实困惑" autoFocus maxLength={280} rows={3} placeholder="例如：我害怕踏出第一步……" value={wishInput} onChange={(event) => setWishInput(event.target.value)} />}
        <button className="ui-continue-control" type="submit" aria-label="继续">→</button>
      </form>
      {error ? <p className="ritual-error" role="alert">{error}</p> : null}
    </section> : null}

    {(state.phase === "matching" || state.phase === "mask" || state.phase === "wearing") ? <section className="mask-match-stage" aria-live="polite">
      <div ref={orbitRef} className="mask-orbit" aria-label="八面傩面正在候坛" data-orbit-mode={state.phase === "matching" ? "spatial" : "result-ring"}>
        {getFaceData.masks.map((mask, index) => {
          const selected = state.selectedMaskId === mask.id;
          const [settleX, settleY] = RESULT_RING_SLOTS[index] ?? RESULT_RING_SLOTS[0];
          return <div ref={(node) => { orbitMaskRefs.current[index] = node; }} data-testid="ritual-mask" data-mask-id={mask.id} className={`orbit-mask orbit-mask-${index}${state.phase !== "matching" && selected ? " selected" : ""}${state.phase !== "matching" && !selected ? " dismissed" : ""}`} style={{ "--settle-x": settleX, "--settle-y": settleY } as CSSProperties} key={mask.id}>
            <span className="ritual-mask-card">
              <span className="ritual-mask-face ritual-mask-front"><Image src={mask.views.front} alt={`${mask.name}傩面正面`} width={1086} height={1448} priority /></span>
              <span className="ritual-mask-face ritual-mask-side" aria-hidden="true"><Image src={mask.views.side} alt="" width={1086} height={1448} priority /></span>
              <span className="ritual-mask-face ritual-mask-back"><Image src={mask.views.back} alt={`${mask.name}傩面背面`} width={1086} height={1448} priority /></span>
            </span>
          </div>;
        })}
      </div>
      <div className="match-copy">
        <span>{state.phase === "matching" ? "识 · 惑 · 请 · 面" : "得 · 面"}</span>
        <h1>{state.phase === "matching" ? "八面候坛" : selectedBinding?.name ?? "傩面已至"}</h1>
        <p>{state.phase === "matching" ? "八位职司在雾中候命，一面将循着你的困惑来到坛心。" : `职司 · ${selectedBinding?.duty ?? "候坛守职"}`}</p>
        {state.phase === "mask" && matchReady ? <button type="button" className="enter-dream-button ui-primary-cta" onClick={() => dispatch({ type: "enterStory" })}>入 戏</button> : null}
      </div>
      {state.phase === "wearing" ? <div className="wearing-flash" aria-hidden="true" /> : null}
    </section> : null}

    <button className="get-face-return ui-return-control" type="button" aria-label={entryMode === "wish" ? "返回图鉴" : "返回首页"} onClick={() => { clearGetFaceRitualSession(); onReturn(); }}>← {entryMode === "wish" ? "返回图鉴" : "返回首页"}</button>
    <span className="get-face-brand-mark"><Image src="/dream-assets/brand/nuo-dream-logo-dark.png" alt="大傩幻梦品牌标识" fill sizes="(max-width: 700px) 116px, 190px" /></span>
  </main>;
}
