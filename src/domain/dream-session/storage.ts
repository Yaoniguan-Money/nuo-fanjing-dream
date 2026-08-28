"use client";

import type { Interpretation } from "@/domain/interpretation";
import { dreamSessionSchema, type DreamSession } from "./schema";

const STORAGE_KEY = "dream-session.v1";

export const DREAM_SESSION_STORAGE_KEY = STORAGE_KEY;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function browserSessionStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readDreamSession(storage: StorageLike | null = browserSessionStorage()): DreamSession | null {
  try {
    const value = storage?.getItem(STORAGE_KEY);
    return value ? dreamSessionSchema.parse(JSON.parse(value)) : null;
  } catch {
    return null;
  }
}

export function writeDreamSession(session: DreamSession, storage: StorageLike | null = browserSessionStorage()): void {
  storage?.setItem(STORAGE_KEY, JSON.stringify(dreamSessionSchema.parse(session)));
}

export function completeDreamSession(cardId: string, now = new Date(), storage: StorageLike | null = browserSessionStorage()): DreamSession | null {
  const session = readDreamSession(storage);
  if (!session || session.match.cardId !== cardId) return null;
  const timestamp = now.toISOString();
  const completed = dreamSessionSchema.parse({ ...session, status: "dream-completed", updatedAt: timestamp, playback: { completedAt: timestamp } });
  writeDreamSession(completed, storage);
  return completed;
}

export function saveInterpretation(interpretation: Interpretation, now = new Date(), storage: StorageLike | null = browserSessionStorage()): DreamSession | null {
  const session = readDreamSession(storage);
  if (!session) return null;
  const interpreted = dreamSessionSchema.parse({ ...session, status: "interpreted", updatedAt: now.toISOString(), interpretation });
  writeDreamSession(interpreted, storage);
  return interpreted;
}

/** Clear only the transient dream session; the local codex is a separate boundary. */
export function clearDreamSession(storage: StorageLike | null = browserSessionStorage()): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // Session storage can be unavailable; clearing is best effort.
  }
}
