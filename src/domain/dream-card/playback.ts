import type { DreamCard } from "./schema";

export type PlaybackPhase = "title" | "playing" | "finished";
export interface PlaybackState { phase: PlaybackPhase; actIndex: number; textIndex: number }
export const initialPlaybackState: PlaybackState = { phase: "title", actIndex: 0, textIndex: -1 };

export function advancePlayback(card: DreamCard, current: PlaybackState): PlaybackState {
  if (current.phase === "title") return { ...current, phase: "playing" };
  if (current.phase === "finished") return current;
  const act = card.data.acts[current.actIndex];
  if (current.textIndex < act.texts.length - 1) return { ...current, textIndex: current.textIndex + 1 };
  if (current.actIndex < card.data.acts.length - 1) return { phase: "playing", actIndex: current.actIndex + 1, textIndex: -1 };
  return { ...current, phase: "finished" };
}

export function retreatPlayback(card: DreamCard, current: PlaybackState): PlaybackState {
  if (current.phase !== "playing") return current;
  if (current.textIndex > 0) return { ...current, textIndex: current.textIndex - 1 };
  if (current.textIndex === 0) return { ...current, textIndex: -1 };
  if (current.actIndex === 0) return current;
  const previousActIndex = current.actIndex - 1;
  return { phase: "playing", actIndex: previousActIndex, textIndex: card.data.acts[previousActIndex].texts.length - 1 };
}
