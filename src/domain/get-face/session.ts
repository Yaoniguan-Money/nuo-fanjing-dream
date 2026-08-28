import { z } from "zod";

export const getFaceRitualPhaseSchema = z.enum(["name", "wish", "portrait", "mask", "story", "submitting", "complete"]);
export type GetFaceRitualPhase = z.infer<typeof getFaceRitualPhaseSchema>;

export const getFacePortraitModeSchema = z.enum(["silhouette", "preview"]);
export type GetFacePortraitMode = z.infer<typeof getFacePortraitModeSchema>;

export interface GetFaceRitualSession {
  schemaVersion: "1.0.0";
  phase: GetFaceRitualPhase;
  name: string;
  wish: string;
  portraitMode: GetFacePortraitMode;
  selectedMaskIndex: number | null;
  choices: number[];
  storyIndex: number;
}

export const getFaceRitualSessionSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  phase: getFaceRitualPhaseSchema,
  name: z.string().max(80),
  wish: z.string().max(280),
  // Camera permission/stream state is deliberately not part of this object.
  portraitMode: getFacePortraitModeSchema,
  selectedMaskIndex: z.number().int().min(0).max(3).nullable(),
  choices: z.array(z.number().int().min(0).max(1)).max(3),
  storyIndex: z.number().int().min(0).max(3)
}).strict();

export type GetFaceRitualEvent =
  | { type: "restore"; state: GetFaceRitualSession }
  | { type: "nameSubmitted"; name: string }
  | { type: "wishSubmitted"; wish: string }
  | { type: "portraitPreviewStarted" }
  | { type: "portraitConfirmed" }
  | { type: "portraitSkipped" }
  | { type: "portraitFailed" }
  | { type: "portraitPreviewStopped" }
  | { type: "maskSelected"; index: number }
  | { type: "maskSnapped" }
  | { type: "storyChoice"; choice: number }
  | { type: "matched" }
  | { type: "reset" };

export function createInitialGetFaceRitualSession(): GetFaceRitualSession {
  return {
    schemaVersion: "1.0.0",
    phase: "name",
    name: "",
    wish: "",
    portraitMode: "silhouette",
    selectedMaskIndex: null,
    choices: [],
    storyIndex: 0
  };
}

function cleanText(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

/**
 * Pure transition function for the client ritual. Invalid events are ignored,
 * keeping a stale click or a late camera callback from advancing the ritual.
 */
export function transitionGetFaceRitual(state: GetFaceRitualSession, event: GetFaceRitualEvent): GetFaceRitualSession {
  if (event.type === "restore") return getFaceRitualSessionSchema.parse(event.state);
  if (event.type === "reset") return createInitialGetFaceRitualSession();

  switch (state.phase) {
    case "name":
      if (event.type !== "nameSubmitted") return state;
      {
        const name = cleanText(event.name, 80);
        return name ? { ...state, phase: "wish", name } : state;
      }
    case "wish":
      if (event.type !== "wishSubmitted") return state;
      {
        const wish = cleanText(event.wish, 280);
        return wish.length >= 2 ? { ...state, phase: "portrait", wish } : state;
      }
    case "portrait":
      if (event.type === "portraitPreviewStarted") return { ...state, portraitMode: "preview" };
      if (event.type === "portraitPreviewStopped") return { ...state, portraitMode: "silhouette" };
      if (event.type === "portraitFailed") return { ...state, portraitMode: "silhouette" };
      if (["portraitConfirmed", "portraitSkipped"].includes(event.type)) {
        return { ...state, phase: "mask", portraitMode: "silhouette" };
      }
      return state;
    case "mask":
      if (event.type === "maskSelected" && Number.isInteger(event.index) && event.index >= 0 && event.index <= 3) {
        return { ...state, selectedMaskIndex: event.index };
      }
      if (event.type === "maskSnapped" && state.selectedMaskIndex !== null) return { ...state, phase: "story", storyIndex: 0 };
      return state;
    case "story":
      if (event.type !== "storyChoice" || ![0, 1].includes(event.choice) || state.storyIndex >= 3) return state;
      {
        const choices = [...state.choices, event.choice];
        return { ...state, choices, storyIndex: state.storyIndex + 1, phase: choices.length >= 3 ? "submitting" : "story" };
      }
    case "submitting":
      return event.type === "matched" ? { ...state, phase: "complete" } : state;
    case "complete":
      return state;
  }
}

export const GET_FACE_RITUAL_STORAGE_KEY = "nuo.get-face.ritual.v1";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function browserSessionStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** The persisted boundary excludes camera stream, permission and video data. */
export function readGetFaceRitualSession(storage: StorageLike | null = browserSessionStorage()): GetFaceRitualSession | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(GET_FACE_RITUAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = getFaceRitualSessionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeGetFaceRitualSession(state: GetFaceRitualSession, storage: StorageLike | null = browserSessionStorage()): void {
  if (!storage) return;
  // Preview is transient and must never be mistaken for saved camera state.
  const persisted = getFaceRitualSessionSchema.parse({ ...state, portraitMode: "silhouette" });
  try {
    storage.setItem(GET_FACE_RITUAL_STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // Storage can be unavailable in private browsing; the ritual remains usable.
  }
}

export function clearGetFaceRitualSession(storage: StorageLike | null = browserSessionStorage()): void {
  try {
    storage?.removeItem(GET_FACE_RITUAL_STORAGE_KEY);
  } catch {
    // Clearing is best effort and must not block navigation.
  }
}

// Short aliases keep the boundary convenient for feature code and tests.
export const readGetFaceSession = readGetFaceRitualSession;
export const writeGetFaceSession = writeGetFaceRitualSession;
export const clearGetFaceSession = clearGetFaceRitualSession;
