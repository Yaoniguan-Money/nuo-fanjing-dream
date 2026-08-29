"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import gsap from "gsap";
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
} from "@/domain/get-face/session-legacy";
import {
  ALTAR_MASK_INDICES,
  ALTAR_SCENE_PHASES,
  altarOrbitPose,
  firstAltarSlotForMask,
  type AltarScenePhase
} from "./altar-scene";
import "./get-face-ritual-legacy.css";

function ritualReducer(state: GetFaceRitualSession, event: GetFaceRitualEvent): GetFaceRitualSession {
  return transitionGetFaceRitual(state, event);
}

function assetPath(asset: string): string {
  return `/${asset.replace(/^\/+/, "")}`;
}

const ALTAR_AMBIENT_MASKS = [
  { maskIndex: 2, className: "altar-ambient altar-foreground altar-left" },
  { maskIndex: 1, className: "altar-ambient altar-foreground altar-right" },
  { maskIndex: 3, className: "altar-ambient altar-mid altar-left-mid" },
  { maskIndex: 0, className: "altar-ambient altar-mid altar-right-mid" },
  { maskIndex: 2, className: "altar-ambient altar-far altar-center-far" }
] as const;

const ALTAR_PARTICLES = Array.from({ length: 18 }, (_, index) => index);

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
  const [ceremonyPhase, setCeremonyPhase] = useState<AltarScenePhase | "idle">("idle");
  const [isMatching, setIsMatching] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mountedRef = useRef(true);
  const altarSceneRef = useRef<HTMLDivElement>(null);
  const atmosphereRef = useRef<HTMLDivElement>(null);
  const sceneMaskRefs = useRef<Array<HTMLDivElement | null>>([]);
  const flashRef = useRef<HTMLDivElement>(null);
  const ceremonyTimelineRef = useRef<gsap.core.Timeline | null>(null);

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

  const killCeremony = useCallback(() => {
    ceremonyTimelineRef.current?.kill();
    ceremonyTimelineRef.current = null;
    if (altarSceneRef.current) gsap.killTweensOf(altarSceneRef.current.querySelectorAll("*"));
    if (atmosphereRef.current) gsap.killTweensOf(atmosphereRef.current);
    if (flashRef.current) gsap.killTweensOf(flashRef.current);
  }, []);

  useEffect(() => {
    const releaseOnPageExit = () => killCeremony();
    window.addEventListener("pagehide", releaseOnPageExit);
    return () => {
      window.removeEventListener("pagehide", releaseOnPageExit);
      killCeremony();
    };
  }, [killCeremony]);

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
      // Persist the complete, camera-free whitelist before navigating. The
      // result page derives the face from this boundary and clears it only
      // when the visitor explicitly starts another ritual.
      const completed = transitionGetFaceRitual(ritual, { type: "matched" });
      writeGetFaceRitualSession(completed);
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

  useEffect(() => {
    if (state.phase !== "mask" || state.selectedMaskIndex === null) {
      return;
    }
    const atmosphere = atmosphereRef.current;
    const flash = flashRef.current;
    const sceneNodes = sceneMaskRefs.current.filter((node): node is HTMLDivElement => Boolean(node));
    const chosenSlot = firstAltarSlotForMask(state.selectedMaskIndex);
    const chosen = chosenSlot >= 0 ? sceneNodes[chosenSlot] : null;
    if (!atmosphere || !flash || !chosen || sceneNodes.length !== ALTAR_MASK_INDICES.length) return;

    let active = true;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const duration = (seconds: number) => reduced ? 0.01 : seconds;
    const announce = (phase: AltarScenePhase) => {
      if (active && ALTAR_SCENE_PHASES.includes(phase)) setCeremonyPhase(phase);
    };
    const otherMasks = sceneNodes.filter((node) => node !== chosen);
    sceneNodes.forEach((node, slot) => {
      const pose = altarOrbitPose(slot, 0, { width: window.innerWidth, height: window.innerHeight });
      gsap.set(node, { ...pose, rotationY: 0 });
    });
    gsap.set(chosen, { opacity: 1, zIndex: 30 });
    gsap.set(atmosphere, { opacity: 0.3 });
    gsap.set(flash, { opacity: 0 });

    const timeline = gsap.timeline({
      defaults: { ease: "power2.inOut", overwrite: "auto" },
      onComplete: () => {
        ceremonyTimelineRef.current = null;
        if (active) setCeremonyPhase("blackout");
      }
    });
    ceremonyTimelineRef.current = timeline;
    timeline.call(() => announce("selecting"), undefined, 0)
      .to(atmosphere, { opacity: 1, duration: duration(.24) }, 0)
      .call(() => announce("spinning"), undefined, duration(.24))
      // Three shared turns make the whole altar feel like one mechanism.
      .to(sceneNodes, { rotationY: "+=1080", duration: duration(1.5), ease: "power1.inOut" }, duration(.24))
      .call(() => announce("ejecting"), undefined, duration(1.74))
      .to(otherMasks, { x: (_, index) => (index % 2 === 0 ? -1 : 1) * (220 + index * 45), y: 80, scale: .48, opacity: 0, duration: duration(.46), stagger: reduced ? 0 : .035, ease: "power3.in" }, duration(1.74))
      .to(atmosphere, { opacity: .42, duration: duration(.46), ease: "power2.out" }, duration(1.74))
      .call(() => announce("revealing"), undefined, duration(2.2))
      .to(chosen, { x: 0, y: -44, scale: 1.45, opacity: .98, rotationY: 180, duration: duration(.36), ease: "power3.out" }, duration(2.2))
      .to(chosen, { rotationY: 360, duration: duration(.38), ease: "power2.inOut" }, duration(2.56))
      .call(() => announce("impact"), undefined, duration(2.94))
      .to(flash, { opacity: .78, duration: duration(.05), yoyo: true, repeat: reduced ? 0 : 1, ease: "power4.out" }, duration(2.94))
      .to(chosen, { scale: 4.8, duration: duration(.35), ease: "power4.in" }, duration(2.94))
      .to(chosen, { scale: 7.2, opacity: 0, duration: duration(.35), ease: "power4.in" }, duration(3.29))
      .to(atmosphere, { opacity: 0, duration: duration(.35), ease: "power2.in" }, duration(3.29));

    return () => {
      active = false;
      timeline.kill();
      if (ceremonyTimelineRef.current === timeline) ceremonyTimelineRef.current = null;
      gsap.killTweensOf([...sceneNodes, atmosphere, flash]);
    };
  }, [state.phase, state.selectedMaskIndex]);

  useEffect(() => {
    if (state.phase !== "mask") return;
    const scene = altarSceneRef.current;
    const atmosphere = atmosphereRef.current;
    if (!scene || !atmosphere) return;
    let rafId: number | null = null;
    let pointerX = 0;
    let pointerY = 0;
    const renderParallax = () => {
      rafId = null;
      scene.style.setProperty("--altar-parallax-x", `${pointerX * 5}px`);
      scene.style.setProperty("--altar-parallax-y", `${pointerY * 3}px`);
      atmosphere.style.setProperty("--altar-parallax-x", `${pointerX * -2.4}px`);
      atmosphere.style.setProperty("--altar-parallax-y", `${pointerY * -1.4}px`);
    };
    const onPointerMove = (event: PointerEvent) => {
      pointerX = event.clientX / Math.max(window.innerWidth, 1) - .5;
      pointerY = event.clientY / Math.max(window.innerHeight, 1) - .5;
      if (rafId === null) rafId = window.requestAnimationFrame(renderParallax);
    };
    const stopParallax = () => {
      window.removeEventListener("pointermove", onPointerMove);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      rafId = null;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pagehide", stopParallax);
    return () => {
      window.removeEventListener("pagehide", stopParallax);
      stopParallax();
      scene.style.removeProperty("--altar-parallax-x");
      scene.style.removeProperty("--altar-parallax-y");
      atmosphere.style.removeProperty("--altar-parallax-x");
      atmosphere.style.removeProperty("--altar-parallax-y");
    };
  }, [state.phase]);

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

  const visibleCeremonyPhase = state.phase === "mask" ? ceremonyPhase : "idle";

  return <main className="get-face-ritual" data-phase={state.phase} data-ceremony-phase={visibleCeremonyPhase}>
    <div className="get-face-altar" aria-hidden="true" />
    <div ref={atmosphereRef} className="ritual-atmosphere" aria-hidden="true">
      <span className="ritual-fog ritual-fog-far" />
      <span className="ritual-fog ritual-fog-mid" />
      <span className="ritual-fog ritual-fog-front" />
      <span className="ritual-beam ritual-beam-left" />
      <span className="ritual-beam ritual-beam-center" />
      <span className="ritual-beam ritual-beam-right" />
      <div className="ritual-ambient-masks">
        {ALTAR_AMBIENT_MASKS.map(({ maskIndex, className }, index) => <Image key={`${maskIndex}-${index}`} className={className} src={assetPath(getFaceData.masks[maskIndex].asset)} alt="" width={1086} height={1448} sizes="(max-width: 800px) 31vw, 23vw" />)}
      </div>
      <div className="ritual-particles">{ALTAR_PARTICLES.map((particle) => <i key={particle} style={{ "--particle-index": particle, left: `${(particle * 37) % 100}%`, top: `${(particle * 61) % 100}%` } as React.CSSProperties} />)}</div>
    </div>
    <header className="get-face-header"><span>傩 · 梵净入梦</span><small>龙 · 坛 · 请 · 面</small></header>

    {state.phase === "name" || state.phase === "wish" ? <section className="get-face-copy" aria-live="polite">
      <span>{state.phase === "name" ? "龙 · 坛 · 受 · 面" : "问 · 愿"}</span>
      <h1>{state.phase === "name" ? "来者何人？" : `${state.name}，你为何而来？`}</h1>
      <p>{state.phase === "name" ? "你已经被吸进坛前。先报上名字，再说出所问之事，傩引才会替你请面。" : "说出此刻最放不下的一件事。不必说得完整，傩引只需要知道，你真正被什么卡住。"}</p>
      <form onSubmit={state.phase === "name" ? handleNameSubmit : handleWishSubmit} className="get-face-form">
        {state.phase === "name" ? <input value={nameInput} onChange={(event) => setNameInput(event.target.value)} aria-label="你的名字" placeholder="输入你的名字" autoComplete="off" /> : <textarea value={wishInput} onChange={(event) => setWishInput(event.target.value)} aria-label="你的愿望" rows={4} placeholder="例如：我被一个迟迟无法开始的选择困住了……" />}
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

    {state.phase === "mask" ? <section className="get-face-mask-stage" aria-live="polite" data-ceremony-phase={visibleCeremonyPhase}>
      <div ref={altarSceneRef} className="altar-scene" aria-hidden="true">
        {ALTAR_MASK_INDICES.map((maskIndex, slot) => {
          const mask = getFaceData.masks[maskIndex];
          const chosen = slot === firstAltarSlotForMask(state.selectedMaskIndex ?? -1);
          return <div key={`scene-slot-${slot}`} ref={(node) => { sceneMaskRefs.current[slot] = node; }} className={`scene-mask${chosen ? " scene-mask-chosen" : ""}`} data-mask-index={maskIndex} data-slot={slot}>
            <Image className="scene-mask-front" src={assetPath(mask.asset)} alt="" fill sizes="(max-width: 620px) 25vw, (max-width: 800px) 22vw, 18vw" />
            <Image className="scene-mask-back" src={assetPath(mask.asset)} alt="" fill sizes="(max-width: 620px) 25vw, (max-width: 800px) 22vw, 18vw" />
          </div>;
        })}
      </div>
      <div ref={flashRef} className="altar-impact-flash" aria-hidden="true" />
      <div className="mask-ceremony-copy">
        <span>选 · 一 · 面</span>
        <h1>{visibleCeremonyPhase === "blackout" ? "已经入戏" : "坛前择面"}</h1>
        <p>{visibleCeremonyPhase === "blackout" ? `${state.name}，你已戴上「${selectedMask?.name ?? "此面"}」的眼睛。不是它替你回答，而是从这一刻开始，你要用它进入故事。` : "愿望已经替你照见一面，坛前正在替你完成择面。"}</p>
        {visibleCeremonyPhase === "blackout" ? <button type="button" onClick={() => dispatch({ type: "maskSnapped" })}>进入第一幕</button> : null}
      </div>
    </section> : null}

    {state.phase === "story" ? <section className="get-face-story" aria-live="polite">
      <span>{story.eyebrow}</span><p className="story-count">第 {state.storyIndex + 1} / 3 幕</p><h1>{story.title}</h1><p>{story.desc}</p>
      <div className="story-choices">{story.choices.map((choice, index) => <button key={choice} type="button" onClick={() => handleStoryChoice(index)}>{choice}</button>)}</div>
    </section> : null}

    {state.phase === "submitting" ? <section className="get-face-submitting" aria-live="polite"><span>授 · 面 · 成 · 形</span><h1>{isMatching ? "傩引正在结成幻梦" : "再问一次幻梦"}</h1><p>{matchError || "三幕选择已经落定，正在为你创建固定的幻梦卡。"}</p>{matchError ? <button type="button" onClick={() => void submitMatch(state)}>重试匹配</button> : null}</section> : null}

    <button className="get-face-return" type="button" onClick={() => { releaseCamera(); clearGetFaceRitualSession(); onReturn(); }}>返回山门</button>
  </main>;
}
