"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createDreamSession, matchResponseSchema } from "@/domain/dream-session";
import { writeDreamSession } from "@/domain/dream-session/storage";
import { getFaceData, resolveVisual } from "@/domain/get-face";
import {
  createInitialGetFaceRitualSession,
  clearGetFaceRitualSession,
  readGetFaceRitualSession,
  transitionGetFaceRitual,
  writeGetFaceRitualSession,
  type GetFaceRitualEvent,
  type GetFaceRitualSession
} from "@/domain/get-face/session";
import "./get-face-ritual.css";

function ritualReducer(state: GetFaceRitualSession, event: GetFaceRitualEvent): GetFaceRitualSession {
  return transitionGetFaceRitual(state, event);
}

function assetPath(asset: string): string {
  return `/${asset.replace(/^\/+/, "")}`;
}

export function stopGetFaceMediaStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

export function GetFaceRitual({ onReturn }: { onReturn: () => void }) {
  const router = useRouter();
  const [state, dispatch] = useReducer(ritualReducer, undefined, () => {
    // Reading is guarded inside the storage boundary; the browser-only value
    // is restored for a resumed tab while server rendering starts from blank.
    return typeof window === "undefined" ? createInitialGetFaceRitualSession() : (readGetFaceRitualSession() ?? createInitialGetFaceRitualSession());
  });
  const [nameInput, setNameInput] = useState(state.name);
  const [wishInput, setWishInput] = useState(state.wish);
  const [inputError, setInputError] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [matchError, setMatchError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [dragPoint, setDragPoint] = useState({ x: 0, y: 0 });
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mountedRef = useRef(true);
  const dragIndexRef = useRef<number | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    writeGetFaceRitualSession(state);
  }, [state]);

  const releaseCamera = useCallback(() => {
    stopGetFaceMediaStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const releaseOnPageExit = () => releaseCamera();
    const releaseOnVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        releaseCamera();
        dispatch({ type: "portraitPreviewStopped" });
      }
    };
    document.addEventListener("visibilitychange", releaseOnVisibilityChange);
    window.addEventListener("pagehide", releaseOnPageExit);
    window.addEventListener("beforeunload", releaseOnPageExit);
    window.addEventListener("unload", releaseOnPageExit);
    return () => {
      mountedRef.current = false;
      document.removeEventListener("visibilitychange", releaseOnVisibilityChange);
      window.removeEventListener("pagehide", releaseOnPageExit);
      window.removeEventListener("beforeunload", releaseOnPageExit);
      window.removeEventListener("unload", releaseOnPageExit);
      releaseCamera();
    };
  }, [releaseCamera]);

  const startCamera = useCallback(async () => {
    setCameraError("");
    // Deliberately called only from the click handler; there is no capture,
    // recognition, upload, or persistence path for this stream.
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("本机暂不支持镜头，继续以剪影入坛即可。");
      dispatch({ type: "portraitFailed" });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (!mountedRef.current || document.visibilityState === "hidden") {
        stopGetFaceMediaStream(stream);
        return;
      }
      releaseCamera();
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      dispatch({ type: "portraitPreviewStarted" });
    } catch {
      setCameraError("镜头权限未开启，已降级为剪影；你仍可继续请面。");
      dispatch({ type: "portraitFailed" });
    }
  }, [releaseCamera]);

  const continueFromPortrait = useCallback((event: Extract<GetFaceRitualEvent, { type: "portraitConfirmed" | "portraitSkipped" }>) => {
    releaseCamera();
    dispatch(event);
    dispatch({ type: "maskSelected", index: resolveVisual(getFaceData, state.wish) });
  }, [releaseCamera, state.wish]);

  const submitMatch = useCallback(async (ritual: GetFaceRitualSession) => {
    if (isMatching) return;
    setIsMatching(true);
    setMatchError("");
    try {
      const response = await fetch("/api/dream/match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wish: ritual.wish })
      });
      if (!response.ok) throw new Error(`match:${response.status}`);
      const match = matchResponseSchema.parse(await response.json());
      writeDreamSession(createDreamSession(ritual.wish, match));
      clearGetFaceRitualSession();
      dispatch({ type: "matched" });
      router.push(`/dream/${encodeURIComponent(match.cardId)}`);
    } catch {
      setMatchError("山雾暂未回应，请重试；已保留本次请面的选择。");
    } finally {
      setIsMatching(false);
    }
  }, [isMatching, router]);

  const handleStoryChoice = useCallback((choice: number) => {
    const next = transitionGetFaceRitual(state, { type: "storyChoice", choice });
    dispatch({ type: "storyChoice", choice });
    if (next.phase === "submitting") void submitMatch(next);
  }, [state, submitMatch]);

  const beginMaskDrag = useCallback((event: React.PointerEvent<HTMLButtonElement>, index: number) => {
    if (state.phase !== "mask" || index !== state.selectedMaskIndex) return;
    event.preventDefault();
    dragIndexRef.current = index;
    setDragging(true);
    setDragPoint({ x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, [state.phase, state.selectedMaskIndex]);

  const finishMaskDrag = useCallback((event?: PointerEvent, force = false) => {
    const index = dragIndexRef.current;
    if (index === null) return;
    const zone = dropZoneRef.current;
    const rect = zone?.getBoundingClientRect();
    const inZone = force || Boolean(rect && rect.width > 0 && event && event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom);
    dragIndexRef.current = null;
    setDragging(false);
    if (inZone) dispatch({ type: "maskSnapped" });
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const move = (event: PointerEvent) => setDragPoint({ x: event.clientX, y: event.clientY });
    const up = (event: PointerEvent) => finishMaskDrag(event);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [dragging, finishMaskDrag]);

  const handleNameSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!nameInput.trim()) {
      setInputError("请先报上名字。");
      return;
    }
    setInputError("");
    dispatch({ type: "nameSubmitted", name: nameInput });
  };

  const handleWishSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (wishInput.trim().length < 2) {
      setInputError("请至少说下两个字的愿望。");
      return;
    }
    setInputError("");
    dispatch({ type: "wishSubmitted", wish: wishInput });
  };

  const selectedMask = state.selectedMaskIndex === null ? null : getFaceData.masks[state.selectedMaskIndex];
  const story = getFaceData.story[state.storyIndex];
  const viewportWidth = typeof window === "undefined" ? 0 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 0 : window.innerHeight;
  const maskStyle = dragging ? { transform: `translate(${dragPoint.x - viewportWidth / 2}px, ${dragPoint.y - viewportHeight * .43}px)` } : undefined;

  return <main className="get-face-ritual" data-phase={state.phase}>
    <div className="get-face-altar" aria-hidden="true" />
    <header className="get-face-header"><span>傩 · 梵净入梦</span><small>龙 · 坛 · 请 · 面</small></header>

    {state.phase === "name" || state.phase === "wish" ? <section className="get-face-copy" aria-live="polite">
      <span>{state.phase === "name" ? "龙 · 坛 · 受 · 面" : "问 · 愿"}</span>
      <h1>{state.phase === "name" ? "来者何人？" : `${state.name}，你为何而来？`}</h1>
      <p>{state.phase === "name" ? "你已经被吸进坛前。先报上名字，再说出所问之事，傩引才会替你请面。" : "说出此刻最放不下的一件事。不必说得完整，傩引只需要知道，你真正被什么卡住。"}</p>
      <form onSubmit={state.phase === "name" ? handleNameSubmit : handleWishSubmit} className="get-face-form">
        {state.phase === "name" ? <input value={nameInput} onChange={(event) => setNameInput(event.target.value)} autoFocus aria-label="你的名字" placeholder="输入你的名字" autoComplete="off" /> : <textarea value={wishInput} onChange={(event) => setWishInput(event.target.value)} autoFocus aria-label="你的愿望" rows={4} placeholder="例如：我被一个迟迟无法开始的选择困住了……" />}
        <button type="submit">奉告 ↵</button>
        {inputError ? <p className="get-face-error" role="alert">{inputError}</p> : null}
      </form>
    </section> : null}

    {state.phase === "portrait" ? <section className="get-face-portrait" aria-live="polite">
      <span>汝 · 之 · 状 · 貌</span><h1>先以剪影受相</h1>
      <div className={`portrait-frame${state.portraitMode === "preview" ? " previewing" : ""}`}>
        <video ref={videoRef} autoPlay muted playsInline aria-label="本机摄像头预览" />
        <div className="portrait-silhouette" aria-hidden="true" />
      </div>
      <p>默认只显示象征剪影。启镜后仅作本机取景预览，不截帧、不识别、不保存、不上传。</p>
      {cameraError ? <p className="get-face-error" role="alert">{cameraError}</p> : null}
      <div className="portrait-actions">
        <button type="button" onClick={() => void startCamera()}>启镜采相</button>
        <button type="button" onClick={() => continueFromPortrait({ type: "portraitConfirmed" })}>受相入坛</button>
        <button type="button" onClick={() => continueFromPortrait({ type: "portraitSkipped" })}>以影代相</button>
      </div>
    </section> : null}

    {state.phase === "mask" ? <section className="get-face-mask-stage" aria-live="polite">
      <span>选 · 一 · 面</span><h1>把它拖入面中</h1><p>愿望先替你照见一面；拖动这枚朦胧傩影，让它吸附入坛。</p>
      <div className="mask-ring" aria-label="可选面具">
        {getFaceData.masks.map((mask, index) => <button key={mask.id} type="button" className={`mask-choice${index === state.selectedMaskIndex ? " selected" : ""}${dragging && index === state.selectedMaskIndex ? " dragging" : ""}`} style={index === state.selectedMaskIndex ? maskStyle : undefined} onPointerDown={(event) => beginMaskDrag(event, index)} aria-label={`拖动${mask.name}`} aria-pressed={index === state.selectedMaskIndex}>
          <span className="mask-shadow" style={{ backgroundImage: `url(${assetPath(mask.asset)})` }} />
          <strong>{mask.name}</strong>
        </button>)}
      </div>
      <div ref={dropZoneRef} className={`face-drop-zone${dragging ? " active" : ""}`} onPointerUp={() => finishMaskDrag(undefined, true)} aria-label="面具吸附区域">入 · 面</div>
      {selectedMask ? <p className="mask-hint">当前应答：{selectedMask.name}</p> : null}
    </section> : null}

    {state.phase === "story" ? <section className="get-face-story" aria-live="polite">
      <span>{story.eyebrow}</span><p className="story-count">第 {state.storyIndex + 1} / 3 幕</p><h1>{story.title}</h1><p>{story.desc}</p>
      <div className="story-choices">{story.choices.map((choice, index) => <button key={choice} type="button" onClick={() => handleStoryChoice(index)}>{choice}</button>)}</div>
    </section> : null}

    {state.phase === "submitting" ? <section className="get-face-submitting" aria-live="polite"><span>授 · 面 · 成 · 形</span><h1>{isMatching ? "傩引正在结成幻梦" : "再问一次幻梦"}</h1><p>{matchError || "三幕选择已经落定，正在为你创建固定的幻梦卡。"}</p>{matchError ? <button type="button" onClick={() => void submitMatch(state)}>重试匹配</button> : null}</section> : null}

    <button className="get-face-return" type="button" onClick={() => { releaseCamera(); clearGetFaceRitualSession(); onReturn(); }}>返回山门</button>
  </main>;
}
