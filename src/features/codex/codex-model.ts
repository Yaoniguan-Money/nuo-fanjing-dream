import type { CodexEntry } from "@/domain/codex";
import type { FaceData, FaceMask } from "@/domain/get-face";

export type CodexSlotState = "collected" | "locked" | "reserved";

export interface CodexSlotView {
  index: number;
  id: string;
  kind: "mask" | "reserved";
  mask: FaceMask | null;
  entry: CodexEntry | null;
  state: CodexSlotState;
}

export function buildCodexSlots(data: FaceData, entries: Record<string, CodexEntry>): CodexSlotView[] {
  const masksById = new Map(data.masks.map((mask) => [mask.id, mask]));
  return data.codex.slots.map((slot, index) => {
    const mask = masksById.get(slot.id) ?? null;
    const entry = mask ? entries[mask.id] ?? null : null;
    return {
      index,
      id: slot.id,
      kind: slot.kind,
      mask,
      entry,
      state: entry ? "collected" : slot.kind === "reserved" ? "reserved" : "locked"
    };
  });
}

export function collectedCount(slots: readonly CodexSlotView[]): number {
  return slots.reduce((count, slot) => count + (slot.entry ? 1 : 0), 0);
}

export function codexNumber(index: number): string {
  return String(index + 1).padStart(2, "0");
}

export function slotLabel(slot: CodexSlotView): string {
  if (slot.entry && slot.mask) return `查看已收录的${slot.mask.name}`;
  return slot.state === "reserved" ? "待补傩面位置" : "尚未收录的傩面";
}
