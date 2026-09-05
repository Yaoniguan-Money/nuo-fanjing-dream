"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { preloadNextRitualStage } from "@/features/preload/resource-preloader";
import "./threshold.css";

type IntroStage = "title" | "dissolving" | "loading" | "video";
type ProgressListener = (value: number) => void;
type ThresholdPreload = (onProgress: ProgressListener, signal: AbortSignal) => Promise<void>;
const MOTES = Array.from({ length: 28 }, (_, index) => index);

function preloadIntroVideo(src: string, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const video = document.createElement("video");
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      video.removeEventListener("loadeddata", finish);
      video.removeEventListener("error", finish);
      signal.removeEventListener("abort", finish);
      video.removeAttribute("src");
      resolve();
    };
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.addEventListener("loadeddata", finish, { once: true });
    video.addEventListener("error", finish, { once: true });
    signal.addEventListener("abort", finish, { once: true });
    video.src = src;
    video.load();
  });
}

export function ThresholdExperience({ onCrossThreshold, onIntroVideoStart, onLoadingStart, onStart, introVideoSrc, minimumLoadMs, preload }: {
  onCrossThreshold: () => void;
  onIntroVideoStart?: () => void;
  onLoadingStart?: () => void;
  onStart?: () => void;
  introVideoSrc?: string;
  minimumLoadMs?: number;
  preload?: ThresholdPreload;
}) {
  const [stage, setStage] = useState<IntroStage>("title");
  const [progress, setProgress] = useState(0);
  const [slowNetwork, setSlowNetwork] = useState(false);
  const [canEnterLightweight, setCanEnterLightweight] = useState(false);
  const videoStartNotified = useRef(false);
  const lightweightRequested = useRef(false);
  const continueLightweight = useRef<(() => void) | null>(null);
  const cancelOptionalPreload = useRef<(() => void) | null>(null);

  const start = useCallback(() => {
    if (stage !== "title") return;
    onStart?.();
    setStage("dissolving");
  }, [onStart, stage]);

  useEffect(() => {
    if (stage !== "dissolving") return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const timer = window.setTimeout(() => setStage("loading"), reduced ? 30 : 720);
    return () => window.clearTimeout(timer);
  }, [stage]);

  useEffect(() => {
    if (stage !== "loading") return;
    let active = true;
    let minimumReady = false;
    let requiredReady = false;
    let optionalReady = !introVideoSrc || Boolean(preload);
    let requiredProgress = 0;
    let completed = false;
    const controller = new AbortController();
    const optionalController = new AbortController();
    cancelOptionalPreload.current = () => optionalController.abort();
    const mobile = window.matchMedia?.("(max-width: 700px)").matches ?? false;
    const visibleFor = minimumLoadMs ?? (mobile ? 2400 : 1800);

    const finishIfReady = () => {
      if (!active || completed || !minimumReady || !requiredReady || (!optionalReady && !lightweightRequested.current)) return;
      completed = true;
      setProgress(100);
      if (lightweightRequested.current || !introVideoSrc) onCrossThreshold();
      else setStage("video");
    };
    continueLightweight.current = finishIfReady;
    onLoadingStart?.();

    const minimumTimer = window.setTimeout(() => {
      minimumReady = true;
      finishIfReady();
    }, visibleFor);
    const slowTimer = window.setTimeout(() => setSlowNetwork(true), 10_000);
    const lightweightTimer = window.setTimeout(() => setCanEnterLightweight(true), 15_000);
    const renderCombinedProgress = () => {
      if (!active) return;
      setProgress(introVideoSrc && !preload
        ? Math.round(requiredProgress * .8 + (optionalReady ? 20 : 0))
        : requiredProgress);
    };
    const reportRequired = (value: number) => {
      requiredProgress = Math.min(100, Math.max(0, Math.round(value)));
      renderCombinedProgress();
    };
    const required = preload
      ? preload(reportRequired, controller.signal)
      : preloadNextRitualStage(reportRequired, controller.signal);
    void required.catch(() => undefined).then(() => {
      if (!active || controller.signal.aborted) return;
      requiredReady = true;
      finishIfReady();
    });
    if (introVideoSrc && !preload) {
      void preloadIntroVideo(introVideoSrc, optionalController.signal).then(() => {
        if (!active || optionalController.signal.aborted) return;
        optionalReady = true;
        renderCombinedProgress();
        finishIfReady();
      });
    }

    return () => {
      active = false;
      continueLightweight.current = null;
      cancelOptionalPreload.current = null;
      controller.abort();
      optionalController.abort();
      window.clearTimeout(minimumTimer);
      window.clearTimeout(slowTimer);
      window.clearTimeout(lightweightTimer);
    };
  }, [introVideoSrc, minimumLoadMs, onCrossThreshold, onLoadingStart, preload, stage]);

  useEffect(() => {
    if (stage !== "video" || videoStartNotified.current) return;
    videoStartNotified.current = true;
    onIntroVideoStart?.();
  }, [onIntroVideoStart, stage]);

  const enterLightweight = useCallback(() => {
    lightweightRequested.current = true;
    cancelOptionalPreload.current?.();
    continueLightweight.current?.();
  }, []);

  return <main className="threshold-experience" data-stage={stage}>
    <div className="threshold-dawn" aria-hidden="true" />
    <div className="threshold-cloud threshold-cloud-a" aria-hidden="true" />
    <div className="threshold-cloud threshold-cloud-b" aria-hidden="true" />
    {(stage === "title" || stage === "dissolving") ? <section className="threshold-title" aria-label="大傩幻梦开始画面">
      <div className="threshold-logo-wrap">
        <Image className="threshold-logo" src="/dream-assets/brand/nuo-dream-logo-cover-clean.png" alt="大傩幻梦" fill sizes="(max-width: 700px) 96vw, 680px" preload />
        <div className="threshold-particles" aria-hidden="true">{MOTES.map((mote) => <i key={mote} style={{ "--i": mote } as React.CSSProperties} />)}</div>
      </div>
      <button type="button" className="threshold-start" onClick={start} disabled={stage !== "title"}>开始入梦</button>
      <Link className="threshold-codex-link" href="/codex" prefetch={false}>直接进入图鉴</Link>
      <small>贵州傩文化·沉浸式数字幻梦</small>
    </section> : null}
    {stage === "loading" ? <section className="threshold-loading" aria-label="幻梦加载中">
      <div className="threshold-loading-seal" aria-hidden="true" />
      <div className="threshold-loading-logo-wrap"><Image className="threshold-loading-logo" src="/dream-assets/brand/nuo-dream-logo-cover-clean.png" alt="大傩幻梦加载标识" fill sizes="(max-width: 700px) 78vw, 440px" preload /></div>
      <span className="threshold-loading-kicker">雾 · 起 · 龙 · 坛</span>
      <h1>幻梦加载中</h1>
      <div className="threshold-loading-progress" role="progressbar" aria-label="幻梦加载进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <i style={{ "--loading-progress": `${progress}%` } as React.CSSProperties} />
        <b aria-hidden="true" style={{ "--loading-progress": `${progress}%` } as React.CSSProperties} />
      </div>
      <output>{String(progress).padStart(2, "0")}%</output>
      <p>{slowNetwork ? "山雾较浓，仍在载入……" : "正为你请来坛前八面"}</p>
      {canEnterLightweight ? <button type="button" className="threshold-lightweight" onClick={enterLightweight}>轻量进入</button> : null}
    </section> : null}
    {stage === "video" && introVideoSrc ? <section className="threshold-video-stage">
      <video className="threshold-video" src={introVideoSrc} autoPlay muted playsInline onEnded={onCrossThreshold} onError={onCrossThreshold} aria-label="入梦开场影片">当前浏览器无法播放开场影片。</video>
      <button type="button" onClick={onCrossThreshold}>跳过</button>
    </section> : null}
  </main>;
}
