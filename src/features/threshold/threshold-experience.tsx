"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getFaceData } from "@/domain/get-face";
import "./threshold.css";

type IntroStage = "title" | "dissolving" | "loading" | "video";
type ProgressListener = (value: number) => void;
type ThresholdPreload = (onProgress: ProgressListener) => Promise<void>;
const MOTES = Array.from({ length: 28 }, (_, index) => index);

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const image = new window.Image();
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    image.onload = () => {
      try {
        const decoded = image.decode?.();
        if (decoded) void decoded.then(finish, finish);
        else finish();
      } catch {
        finish();
      }
    };
    image.onerror = finish;
    image.src = src;
  });
}

function preloadVideo(src: string): Promise<void> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      video.removeAttribute("src");
      video.load();
      resolve();
    };
    const timeout = window.setTimeout(finish, 8000);
    video.preload = "auto";
    video.muted = true;
    video.addEventListener("loadeddata", finish, { once: true });
    video.addEventListener("error", finish, { once: true });
    video.src = src;
    video.load();
  });
}

export async function preloadThresholdAssets(introVideoSrc: string | undefined, onProgress: ProgressListener): Promise<void> {
  const imageSources = [
    "/dream-assets/brand/cover-background-v2.png",
    "/dream-assets/brand/nuo-dream-logo-cover-clean.png",
    "/dream-assets/brand/start-button.png",
    "/dream-assets/intro/opening-last-frame.png",
    "/dream-assets/altar/dragon-altar-style.png",
    ...getFaceData.masks.map((mask) => mask.views.front)
  ];
  const imageWeight = introVideoSrc ? 70 / imageSources.length : 100 / imageSources.length;
  let loaded = 0;
  onProgress(0);
  const images = imageSources.map(async (src) => {
    await preloadImage(src);
    loaded += imageWeight;
    onProgress(Math.round(loaded));
  });
  const video = introVideoSrc ? preloadVideo(introVideoSrc).then(() => { loaded += 30; onProgress(Math.round(loaded)); }) : Promise.resolve();
  await Promise.all([...images, video]);
  onProgress(100);
}

export function ThresholdExperience({ onCrossThreshold, introVideoSrc, minimumLoadMs, preload }: { onCrossThreshold: () => void; introVideoSrc?: string; minimumLoadMs?: number; preload?: ThresholdPreload }) {
  const [stage, setStage] = useState<IntroStage>("title");
  const [progress, setProgress] = useState(0);

  const start = useCallback(() => {
    if (stage !== "title") return;
    setStage("dissolving");
  }, [stage]);

  useEffect(() => {
    if (stage !== "dissolving") return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const timer = window.setTimeout(() => setStage("loading"), reduced ? 30 : 720);
    return () => window.clearTimeout(timer);
  }, [stage]);

  useEffect(() => {
    if (stage !== "loading") return;
    let active = true;
    let minimumTimer: number | undefined;
    let completionTimer: number | undefined;
    const mobile = window.matchMedia?.("(max-width: 700px)").matches ?? false;
    const visibleFor = minimumLoadMs ?? (mobile ? 2400 : 1800);
    const minimum = new Promise<void>((resolve) => {
      minimumTimer = window.setTimeout(resolve, visibleFor);
    });
    const reportProgress = (value: number) => {
      if (active) setProgress(Math.min(92, Math.max(0, Math.round(value))));
    };
    const assets = preload
      ? preload(reportProgress)
      : preloadThresholdAssets(introVideoSrc, reportProgress);
    void Promise.all([minimum, assets]).then(() => {
      if (!active) return;
      setProgress(100);
      completionTimer = window.setTimeout(() => {
        if (!active) return;
        if (introVideoSrc) setStage("video");
        else onCrossThreshold();
      }, 240);
    });
    return () => {
      active = false;
      if (minimumTimer !== undefined) window.clearTimeout(minimumTimer);
      if (completionTimer !== undefined) window.clearTimeout(completionTimer);
    };
  }, [introVideoSrc, minimumLoadMs, onCrossThreshold, preload, stage]);

  return <main className="threshold-experience" data-stage={stage}>
    <div className="threshold-dawn" aria-hidden="true" />
    <div className="threshold-cloud threshold-cloud-a" aria-hidden="true" />
    <div className="threshold-cloud threshold-cloud-b" aria-hidden="true" />
    {(stage === "title" || stage === "dissolving") ? <section className="threshold-title" aria-label="大傩幻梦开始画面">
      <div className="threshold-logo-wrap">
        <Image className="threshold-logo" src="/dream-assets/brand/nuo-dream-logo-cover-clean.png" alt="大傩幻梦" fill sizes="(max-width: 700px) 96vw, 680px" priority />
        <div className="threshold-particles" aria-hidden="true">{MOTES.map((mote) => <i key={mote} style={{ "--i": mote } as React.CSSProperties} />)}</div>
      </div>
      <button type="button" className="threshold-start" onClick={start} disabled={stage !== "title"}>开始入梦</button>
      <Link className="threshold-codex-link" href="/codex">直接进入图鉴</Link>
      <small>贵州傩文化·沉浸式数字幻梦</small>
    </section> : null}
    {stage === "loading" ? <section className="threshold-loading" aria-label="幻梦加载中">
      <div className="threshold-loading-seal" aria-hidden="true" />
      <div className="threshold-loading-logo-wrap"><Image className="threshold-loading-logo" src="/dream-assets/brand/nuo-dream-logo-cover-clean.png" alt="大傩幻梦加载标识" fill sizes="(max-width: 700px) 78vw, 440px" priority /></div>
      <span className="threshold-loading-kicker">雾 · 起 · 龙 · 坛</span>
      <h1>幻梦加载中</h1>
      <div className="threshold-loading-progress" role="progressbar" aria-label="幻梦加载进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <i style={{ "--loading-progress": `${progress}%` } as React.CSSProperties} />
        <b aria-hidden="true" style={{ "--loading-progress": `${progress}%` } as React.CSSProperties} />
      </div>
      <output>{String(progress).padStart(2, "0")}%</output>
      <p>正为你请来坛前八面</p>
    </section> : null}
    {stage === "video" && introVideoSrc ? <section className="threshold-video-stage">
      <video className="threshold-video" src={introVideoSrc} autoPlay playsInline onEnded={onCrossThreshold} onError={onCrossThreshold} aria-label="入梦开场影片" />
      <button type="button" onClick={onCrossThreshold}>跳过</button>
    </section> : null}
  </main>;
}
