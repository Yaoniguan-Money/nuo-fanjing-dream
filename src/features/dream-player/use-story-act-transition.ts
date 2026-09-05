"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { advancePlayback, getDreamActAssetUrls, type DreamCard, type PlaybackState } from "@/domain/dream-card";

export type StoryActTransitionPhase = "idle" | "fading-out" | "waiting" | "fading-in";

const STORY_ACT_TRANSITION_TIMING = {
  standard: { fadeOutMs: 320, fadeInMs: 460 },
  reduced: { fadeOutMs: 1, fadeInMs: 1 }
} as const;

function wait(durationMs: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, durationMs));
}

function decodeImage(url: string): Promise<void> {
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  if (typeof image.decode === "function") return image.decode().catch(() => undefined);
  if (image.complete) return Promise.resolve();
  return new Promise((resolve) => {
    image.onload = () => resolve();
    image.onerror = () => resolve();
  });
}

function preloadActAssets(urls: readonly string[]): Promise<void> {
  return Promise.all(urls.map(decodeImage)).then(() => undefined);
}

interface UseStoryActTransitionOptions {
  card: DreamCard;
  playback: PlaybackState;
  setPlayback: Dispatch<SetStateAction<PlaybackState>>;
}

export function useStoryActTransition({ card, playback, setPlayback }: UseStoryActTransitionOptions) {
  const [phase, setPhase] = useState<StoryActTransitionPhase>("idle");
  const runningRef = useRef(false);
  const generationRef = useRef(0);

  useEffect(() => () => { generationRef.current += 1; }, []);

  const begin = useCallback((): boolean => {
    if (runningRef.current || playback.phase !== "playing") return false;
    const act = card.data.acts[playback.actIndex];
    const nextAct = card.data.acts[playback.actIndex + 1];
    if (!act || !nextAct || playback.textIndex < act.texts.length - 1) return false;

    runningRef.current = true;
    const generation = generationRef.current;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const timing = reducedMotion ? STORY_ACT_TRANSITION_TIMING.reduced : STORY_ACT_TRANSITION_TIMING.standard;
    const assetsReady = preloadActAssets(getDreamActAssetUrls(nextAct));
    setPhase("fading-out");

    void (async () => {
      await wait(timing.fadeOutMs);
      if (generation !== generationRef.current) return;
      setPhase("waiting");
      await assetsReady;
      if (generation !== generationRef.current) return;
      setPlayback((current) => {
        if (current.phase !== "playing" || current.actIndex !== playback.actIndex || current.textIndex !== playback.textIndex) return current;
        return advancePlayback(card, current);
      });
      setPhase("fading-in");
      await wait(timing.fadeInMs);
      if (generation !== generationRef.current) return;
      runningRef.current = false;
      setPhase("idle");
    })();
    return true;
  }, [card, playback, setPlayback]);

  const isRunning = useCallback(() => runningRef.current, []);
  return { begin, isRunning, phase };
}
