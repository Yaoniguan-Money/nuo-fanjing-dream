import { createDreamSession } from "@/domain/dream-session";
import { completeDreamSession, readDreamSession, writeDreamSession } from "@/domain/dream-session/storage";
import { ritualMaskByStoryId } from "@/domain/get-face";
import { createInitialGetFaceRitualSession, readGetFaceRitualSession, writeGetFaceRitualSession } from "@/domain/get-face/session";

export type RuntimeStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function browserSessionStorage(): RuntimeStorage | null {
  if (typeof window === "undefined") return null;
  try { return window.sessionStorage; } catch { return null; }
}

export function ensureStoryRuntime(
  cardId: string,
  dreamStorage: RuntimeStorage | null = browserSessionStorage(),
  ritualStorage: RuntimeStorage | null = browserSessionStorage()
): void {
  const binding = ritualMaskByStoryId(cardId);
  if (!binding) return;

  const dream = readDreamSession(dreamStorage);
  if (dream?.match.cardId !== cardId || dream.match.maskId !== binding.maskId) {
    writeDreamSession(createDreamSession("自主选择剧情体验", {
      schemaVersion: "1.0.0",
      cardId,
      maskId: binding.maskId,
      provider: "direct-story",
      confidence: 1,
      reason: "由已制作剧情直接进入，并按唯一关系表绑定对应傩面。"
    }), dreamStorage);
  }

  const current = readGetFaceRitualSession(ritualStorage);
  if (current?.cardId !== cardId || current.selectedMaskId !== binding.maskId) {
    writeGetFaceRitualSession({
      ...createInitialGetFaceRitualSession(),
      phase: "wearing",
      name: current?.name || "访客",
      wish: current?.wish || "自主选择剧情体验",
      cardId,
      selectedMaskId: binding.maskId,
      selectedMaskIndex: null
    }, ritualStorage);
  }
}

export function completeStoryRuntime(
  cardId: string,
  dreamStorage: RuntimeStorage | null = browserSessionStorage(),
  ritualStorage: RuntimeStorage | null = browserSessionStorage()
): void {
  ensureStoryRuntime(cardId, dreamStorage, ritualStorage);
  completeDreamSession(cardId, new Date(), dreamStorage);
  const binding = ritualMaskByStoryId(cardId);
  const current = readGetFaceRitualSession(ritualStorage);
  if (!binding || !current) return;
  writeGetFaceRitualSession({
    ...current,
    phase: "complete",
    cardId,
    selectedMaskId: binding.maskId,
    selectedMaskIndex: null
  }, ritualStorage);
}
