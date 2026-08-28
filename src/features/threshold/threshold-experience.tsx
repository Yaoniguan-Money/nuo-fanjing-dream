"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import gsap from "gsap";
import { resolveAssetId } from "@/domain/dream-card";
import { addTrackedListener } from "./runtime-lifecycle";
import { createThresholdScene } from "./threshold-scene";
import "./threshold.css";

export function ThresholdExperience({ onCrossThreshold }: { onCrossThreshold: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mountainRef = useRef<HTMLDivElement>(null);
  const hallRef = useRef<HTMLDivElement>(null);
  const villageRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ReturnType<typeof createThresholdScene> | null>(null);
  const holdTweenRef = useRef<gsap.core.Tween | null>(null);
  const holdValueRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const mountain = mountainRef.current;
    const hall = hallRef.current;
    const village = villageRef.current;
    if (!canvas || !mountain || !hall || !village) return;
    const scene = createThresholdScene({ canvas, mountain, hall, village });
    sceneRef.current = scene;
    const removeResize = addTrackedListener(window, "resize", scene.resize as EventListener);
    let active = true;
    scene.intro().then(() => { if (active) setReady(true); });
    return () => {
      active = false;
      holdTweenRef.current?.kill();
      removeResize();
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  const applyProgress = useCallback((progress: number) => {
    holdValueRef.current = progress;
    progressRef.current?.style.setProperty("--hold-progress", `${progress * 360}deg`);
  }, []);

  const cancelHold = useCallback(() => {
    if (opening) return;
    holdTweenRef.current?.kill();
    holdTweenRef.current = gsap.to({ value: holdValueRef.current }, { value: 0, duration: .22, ease: "power2.out", onUpdate() { applyProgress(this.targets()[0].value); }, onComplete: () => { holdTweenRef.current = null; } });
  }, [applyProgress, opening]);

  const openDoor = useCallback(async () => {
    if (opening || !sceneRef.current) return;
    setOpening(true);
    await sceneRef.current.openDoor();
    onCrossThreshold();
  }, [onCrossThreshold, opening]);

  const startHold = useCallback(() => {
    if (!ready || opening || holdTweenRef.current) return;
    const state = { value: holdValueRef.current };
    holdTweenRef.current = gsap.to(state, { value: 1, duration: 1.2, ease: "none", onUpdate: () => applyProgress(state.value), onComplete: () => { holdTweenRef.current = null; void openDoor(); } });
  }, [applyProgress, openDoor, opening, ready]);

  const startPointerHold = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    startHold();
  }, [startHold]);

  useEffect(() => {
    const keyDown = (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (["Space", "Enter"].includes(keyboardEvent.code)) { keyboardEvent.preventDefault(); startHold(); }
    };
    const keyUp = (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (["Space", "Enter"].includes(keyboardEvent.code)) cancelHold();
    };
    const removeDown = addTrackedListener(window, "keydown", keyDown);
    const removeUp = addTrackedListener(window, "keyup", keyUp);
    return () => { removeDown(); removeUp(); };
  }, [cancelHold, startHold]);

  return <section className="threshold-experience">
    <div ref={mountainRef} className="threshold-plate threshold-mountain" style={{ backgroundImage: `url(${resolveAssetId("threshold.fanjing-backdrop")})` }} />
    <div ref={hallRef} className="threshold-plate threshold-hall" style={{ backgroundImage: `url(${resolveAssetId("threshold.ritual-hall")})` }} />
    <div ref={villageRef} className="threshold-plate threshold-village" style={{ backgroundImage: `url(${resolveAssetId("threshold.village-door")})` }} />
    <canvas ref={canvasRef} className="threshold-canvas" aria-label="梵净山入村镜头" />
    <div className="threshold-vignette" />
    <div className={`threshold-copy${ready ? " ready" : ""}`}><span>傩 · 梵净入梦</span><h1>{ready ? "山门已至" : "循雾入山"}</h1><p>{ready ? "按住门环，让门认出你的来意。" : "镜头正在穿过梵净山雾。"}</p></div>
    <div className={`threshold-controls${ready ? " ready" : ""}`}>
      <button type="button" className="hold-ring" onPointerDown={startPointerHold} onPointerUp={cancelHold} onPointerCancel={cancelHold} disabled={!ready || opening} aria-describedby="threshold-hold-hint">
        <span ref={progressRef} className="hold-progress" aria-hidden="true" />
        {opening ? "门已启" : "按住门环"}
      </button>
      <small id="threshold-hold-hint"><span className="threshold-hint-touch">触碰并长按门环</span><span className="threshold-hint-pointer">鼠标长按 · Space / Enter</span></small>
    </div>
  </section>;
}
