"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import "./threshold.css";

type IntroStage = "title" | "dissolving" | "video";
const MOTES = Array.from({ length: 28 }, (_, index) => index);

export function ThresholdExperience({ onCrossThreshold, introVideoSrc }: { onCrossThreshold: () => void; introVideoSrc?: string }) {
  const [stage, setStage] = useState<IntroStage>("title");

  const start = useCallback(() => {
    if (stage !== "title") return;
    setStage("dissolving");
  }, [stage]);

  useEffect(() => {
    if (stage !== "dissolving") return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const timer = window.setTimeout(() => {
      if (introVideoSrc) setStage("video");
      else onCrossThreshold();
    }, reduced ? 30 : 720);
    return () => window.clearTimeout(timer);
  }, [introVideoSrc, onCrossThreshold, stage]);

  return <main className="threshold-experience" data-stage={stage}>
    <div className="threshold-dawn" aria-hidden="true" />
    <div className="threshold-cloud threshold-cloud-a" aria-hidden="true" />
    <div className="threshold-cloud threshold-cloud-b" aria-hidden="true" />
    {stage !== "video" ? <section className="threshold-title" aria-label="大傩幻梦开始画面">
      <div className="threshold-logo-wrap">
        <Image className="threshold-logo" src="/dream-assets/brand/nuo-dream-logo-cover-clean.png" alt="大傩幻梦" fill sizes="(max-width: 700px) 96vw, 680px" priority />
        <div className="threshold-particles" aria-hidden="true">{MOTES.map((mote) => <i key={mote} style={{ "--i": mote } as React.CSSProperties} />)}</div>
      </div>
      <button type="button" className="threshold-start" onClick={start} disabled={stage !== "title"}>开始入梦</button>
      <Link className="threshold-codex-link" href="/codex">直接进入图鉴</Link>
      <small>贵州傩文化·沉浸式数字幻梦</small>
    </section> : null}
    {stage === "video" && introVideoSrc ? <section className="threshold-video-stage">
      <video className="threshold-video" src={introVideoSrc} autoPlay playsInline onEnded={onCrossThreshold} onError={onCrossThreshold} aria-label="入梦开场影片" />
      <button type="button" onClick={onCrossThreshold}>跳过</button>
    </section> : null}
  </main>;
}
