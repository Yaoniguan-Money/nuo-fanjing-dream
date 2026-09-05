import { z } from "zod";

export const getFaceRitualPhaseSchema = z.enum(["name", "wish", "matching", "mask", "wearing", "complete"]);
export type GetFaceRitualPhase = z.infer<typeof getFaceRitualPhaseSchema>;

export interface GetFaceRitualSession {
  schemaVersion: "2.0.0";
  phase: GetFaceRitualPhase;
  name: string;
  wish: string;
  selectedMaskIndex: number | null;
  selectedMaskId?: string;
  cardId: string | null;
}

export const getFaceRitualSessionSchema = z.object({
  schemaVersion: z.literal("2.0.0"),
  phase: getFaceRitualPhaseSchema,
  name: z.string().max(80),
  wish: z.string().max(280),
  selectedMaskIndex: z.number().int().min(0).max(7).nullable(),
  selectedMaskId: z.string().min(1).max(80).optional(),
  cardId: z.string().min(1).max(160).nullable()
}).strict();

export type GetFaceRitualEvent =
  | { type: "restore"; state: GetFaceRitualSession }
  | { type: "nameSubmitted"; name: string }
  | { type: "wishSubmitted"; wish: string }
  | { type: "matchResolved"; cardId: string; maskIndex: number; maskId?: string }
  | { type: "enterStory" }
  | { type: "wearComplete" }
  | { type: "reset" };

export function createInitialGetFaceRitualSession(): GetFaceRitualSession {
  return { schemaVersion: "2.0.0", phase: "name", name: "", wish: "", selectedMaskIndex: null, cardId: null };
}

function cleanText(value: string, maxLength: number): string { return value.trim().slice(0, maxLength); }

export function createWishEntryGetFaceRitualSession(previous: GetFaceRitualSession | null): GetFaceRitualSession {
  const name = cleanText(previous?.name ?? "", 80);
  return { ...createInitialGetFaceRitualSession(), phase: name ? "wish" : "name", name };
}

export function transitionGetFaceRitual(state: GetFaceRitualSession, event: GetFaceRitualEvent): GetFaceRitualSession {
  if (event.type === "restore") return getFaceRitualSessionSchema.parse(event.state);
  if (event.type === "reset") return createInitialGetFaceRitualSession();
  if (state.phase === "name" && event.type === "nameSubmitted") {
    const name = cleanText(event.name, 80);
    return name ? { ...state, phase: "wish", name } : state;
  }
  if (state.phase === "wish" && event.type === "wishSubmitted") {
    const wish = cleanText(event.wish, 280);
    return wish.length >= 2 ? { ...state, phase: "matching", wish } : state;
  }
  if (state.phase === "matching" && event.type === "matchResolved" && Number.isInteger(event.maskIndex) && event.maskIndex >= 0 && event.maskIndex <= 7) {
    const selectedMaskId = cleanText(event.maskId ?? "", 80);
    return { ...state, phase: "mask", cardId: cleanText(event.cardId, 160), selectedMaskIndex: event.maskIndex, ...(selectedMaskId ? { selectedMaskId } : {}) };
  }
  if (state.phase === "mask" && event.type === "enterStory" && state.cardId && state.selectedMaskIndex !== null) return { ...state, phase: "wearing" };
  if (state.phase === "wearing" && event.type === "wearComplete") return { ...state, phase: "complete" };
  return state;
}

export const GET_FACE_RITUAL_STORAGE_KEY = "nuo.get-face.ritual.v2";
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function browserSessionStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try { return window.sessionStorage; } catch { return null; }
}

export function readGetFaceRitualSession(storage: StorageLike | null = browserSessionStorage()): GetFaceRitualSession | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(GET_FACE_RITUAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = getFaceRitualSessionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}

export function writeGetFaceRitualSession(state: GetFaceRitualSession, storage: StorageLike | null = browserSessionStorage()): void {
  if (!storage) return;
  try { storage.setItem(GET_FACE_RITUAL_STORAGE_KEY, JSON.stringify(getFaceRitualSessionSchema.parse(state))); } catch { /* best effort */ }
}

export function clearGetFaceRitualSession(storage: StorageLike | null = browserSessionStorage()): void {
  try { storage?.removeItem(GET_FACE_RITUAL_STORAGE_KEY); } catch { /* best effort */ }
}

export const readGetFaceSession = readGetFaceRitualSession;
export const writeGetFaceSession = writeGetFaceRitualSession;
export const clearGetFaceSession = clearGetFaceRitualSession;
