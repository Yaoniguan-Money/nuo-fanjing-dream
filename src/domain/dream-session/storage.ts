"use client";

import type { Interpretation } from "@/domain/interpretation";
import { dreamSessionSchema, type DreamSession } from "./schema";

const STORAGE_KEY = "dream-session.v1";

export function readDreamSession(): DreamSession | null {
  try {
    const value = window.sessionStorage.getItem(STORAGE_KEY);
    return value ? dreamSessionSchema.parse(JSON.parse(value)) : null;
  } catch {
    return null;
  }
}

export function writeDreamSession(session: DreamSession): void {
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dreamSessionSchema.parse(session)));
}

export function completeDreamSession(cardId: string, now = new Date()): DreamSession | null {
  const session = readDreamSession();
  if (!session || session.match.cardId !== cardId) return null;
  const timestamp = now.toISOString();
  const completed = dreamSessionSchema.parse({ ...session, status: "dream-completed", updatedAt: timestamp, playback: { completedAt: timestamp } });
  writeDreamSession(completed);
  return completed;
}

export function saveInterpretation(interpretation: Interpretation, now = new Date()): DreamSession | null {
  const session = readDreamSession();
  if (!session) return null;
  const interpreted = dreamSessionSchema.parse({ ...session, status: "interpreted", updatedAt: now.toISOString(), interpretation });
  writeDreamSession(interpreted);
  return interpreted;
}
