"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { ThresholdExperience } from "./threshold-experience";

const GetFaceRitual = dynamic(
  () => import("@/features/get-face/get-face-ritual").then((module) => module.GetFaceRitual),
  { ssr: false }
);

export function ThresholdShell() {
  const [stage, setStage] = useState<"intro" | "bridge" | "ritual">("intro");
  const cross = useCallback(() => setStage("bridge"), []);
  useEffect(() => {
    if (stage !== "bridge") return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const timer = window.setTimeout(() => setStage("ritual"), reduced ? 30 : 1320);
    return () => window.clearTimeout(timer);
  }, [stage]);
  if (stage === "ritual") return <GetFaceRitual onReturn={() => setStage("intro")} />;
  if (stage === "bridge") return <main className="threshold-bridge" aria-label="从开场影片进入龙坛">
    <div className="threshold-bridge-video-frame" aria-hidden="true" />
    <div className="threshold-bridge-altar" aria-hidden="true" />
    <div className="threshold-bridge-mist" aria-hidden="true" />
    <p>龙 · 坛 · 显 · 影</p>
  </main>;
  return <ThresholdExperience introVideoSrc="/dream-assets/intro/opening.mp4" onCrossThreshold={cross} />;
}
