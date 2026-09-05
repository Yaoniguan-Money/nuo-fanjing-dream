"use client";

import { RITUAL_MASK_THUMBNAILS } from "@/domain/get-face/ritual-mask-thumbnails";

export type PreloadStrategy = "immediate" | "idle";

export interface PreloadOptions {
  strategy?: PreloadStrategy;
  concurrency?: number;
  kind?: "image" | "video" | "fetch";
  timeoutMs?: number;
}

export const NEXT_RITUAL_STAGE_URLS = [
  "/dream-assets/intro/opening-last-frame.png",
  "/dream-assets/altar/dragon-altar-style.png",
  "/dream-assets/brand/nuo-dream-logo-dark.png",
  "/dream-assets/ui/ritual/answer-frame-v2.svg",
  ...RITUAL_MASK_THUMBNAILS
] as const;

const seen = new Set<string>();
const manifestCache = new Map<string, Promise<DreamPreloadManifest | null>>();

export interface DreamPreloadManifest {
  cardId: string;
  firstAct: string[];
  story: string[];
  codex: string[];
}

export function normalizePreloadUrls(urls: readonly string[]): string[] {
  return [...new Set(urls.filter((url) => url.startsWith("/dream-assets/")))];
}

function schedule(work: () => void, strategy: PreloadStrategy, timeoutMs: number): void {
  if (strategy !== "idle" || typeof window === "undefined") {
    work();
    return;
  }
  const requestIdle = window.requestIdleCallback ?? ((callback: IdleRequestCallback) => window.setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 0 }), 1));
  requestIdle(work, { timeout: timeoutMs });
}

function preloadOne(url: string, kind: PreloadOptions["kind"]): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (kind === "fetch") {
    return fetch(url, { cache: "force-cache" }).then(() => undefined).catch(() => undefined);
  }
  if (kind === "video") {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "video";
    link.href = url;
    document.head.appendChild(link);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = url;
  });
}

async function runQueue(urls: string[], options: Required<Pick<PreloadOptions, "concurrency" | "kind">>): Promise<void> {
  const pending = urls.filter((url) => {
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });
  let cursor = 0;
  const workers = Array.from({ length: Math.max(1, options.concurrency) }, async () => {
    while (cursor < pending.length) {
      const current = pending[cursor];
      cursor += 1;
      await preloadOne(current, options.kind);
    }
  });
  await Promise.all(workers);
}

export function preloadUrls(urls: readonly string[], options: PreloadOptions = {}): void {
  const normalized = normalizePreloadUrls(urls);
  if (!normalized.length || typeof window === "undefined") return;
  schedule(() => {
    void runQueue(normalized, { concurrency: options.concurrency ?? 2, kind: options.kind ?? "image" });
  }, options.strategy ?? "idle", options.timeoutMs ?? 1800);
}

async function loadDreamPreloadManifest(cardId: string): Promise<DreamPreloadManifest | null> {
  const encoded = encodeURIComponent(cardId);
  if (!manifestCache.has(cardId)) {
    manifestCache.set(cardId, fetch(`/api/dream/preload/${encoded}`, { cache: "force-cache" }).then(async (response) => {
      if (!response.ok) return null;
      return await response.json() as DreamPreloadManifest;
    }).catch(() => null));
  }
  return manifestCache.get(cardId)!;
}

function preloadTrackedImage(url: string, signal?: AbortSignal): Promise<void> {
  if (typeof window === "undefined" || signal?.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const image = new Image();
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      image.onload = null;
      image.onerror = null;
      signal?.removeEventListener("abort", abort);
      resolve();
    };
    const abort = () => {
      image.src = "";
      finish();
    };
    image.decoding = "async";
    image.onload = finish;
    image.onerror = finish;
    signal?.addEventListener("abort", abort, { once: true });
    image.src = url;
  });
}

export async function preloadNextRitualStage(onProgress: (value: number) => void = () => undefined, signal?: AbortSignal): Promise<void> {
  const urls = normalizePreloadUrls(NEXT_RITUAL_STAGE_URLS);
  let cursor = 0;
  let completed = 0;
  onProgress(0);
  const workers = Array.from({ length: Math.min(3, urls.length) }, async () => {
    while (cursor < urls.length && !signal?.aborted) {
      const url = urls[cursor];
      cursor += 1;
      await preloadTrackedImage(url, signal);
      if (signal?.aborted) return;
      completed += 1;
      onProgress(Math.round(completed / urls.length * 100));
    }
  });
  await Promise.all(workers);
}

export async function preloadMatchedDreamResources(cardId: string, scope: "first-act" | "story" | "codex" | "all"): Promise<void> {
  const manifest = await loadDreamPreloadManifest(cardId);
  if (!manifest) return;
  if (scope === "first-act") preloadUrls(manifest.firstAct, { strategy: "immediate", concurrency: 3 });
  if (scope === "story") preloadUrls(manifest.story, { strategy: "idle", concurrency: 2 });
  if (scope === "codex") preloadUrls(manifest.codex, { strategy: "idle", concurrency: 1, timeoutMs: 2400 });
  if (scope === "all") {
    preloadUrls(manifest.firstAct, { strategy: "immediate", concurrency: 3 });
    preloadUrls(manifest.story, { strategy: "idle", concurrency: 2 });
    preloadUrls(manifest.codex, { strategy: "idle", concurrency: 1, timeoutMs: 2600 });
  }
}
