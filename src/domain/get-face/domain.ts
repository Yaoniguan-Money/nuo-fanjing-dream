import type { FaceData, FaceMask, FaceRole, FaceRoleKind, FaceMaskVisual } from "./data";

export interface FaceResolutionContext {
  name?: string;
  wish: string;
  choices?: readonly number[];
  maskIndex?: number;
}

export interface FaceRoleResolution {
  role: FaceRole;
  mask: FaceMask;
  score: number;
}

export interface FaceVariant extends FaceMaskVisual {
  seed: number;
  tint: string;
  mark: string;
}

const HAN = /[\u3400-\u9fff]/g;

function clean(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function countHits(text: unknown, tokens: readonly string[]): number {
  const normalized = clean(text);
  return tokens.reduce((score, token) => score + (normalized.includes(clean(token)) ? 1 : 0), 0);
}

function seededIndex(seed: unknown, size: number): number {
  let hash = 2166136261;
  for (const character of String(seed || "")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0) % Math.max(size, 1);
}

export function resolveVisual(data: FaceData, wish: string): number {
  const scores = data.masks.map((mask) => countHits(wish, mask.themes));
  const best = Math.max(...scores);
  return best > 0 ? scores.indexOf(best) : 3;
}

export function resolveRole(data: FaceData, context: FaceResolutionContext): FaceRoleResolution {
  const forcedMask = Number.isInteger(context.maskIndex) ? context.maskIndex as number : resolveVisual(data, context.wish);
  const choices = Array.isArray(context.choices) ? context.choices : [];
  const candidates = data.roles.filter((role) => role.maskIndex === forcedMask && role.id !== "neutral-questioner");
  const scored = candidates.map((role) => ({
    role,
    score: countHits(context.wish, role.triggers) + choices.reduce((total, choice, index) => total + (choice === 0 ? Number(role.choiceWeights[index] || 0) : 0), 0)
  }));
  const best = scored.reduce<{ role: FaceRole; score: number } | null>((winner, entry) => !winner || entry.score > winner.score ? entry : winner, null);
  const role = !best || best.score <= 0 ? data.roles.find((entry) => entry.id === "neutral-questioner") : best.role;
  if (!role) throw new Error("face data must define neutral-questioner");
  const mask = data.masks[role.maskIndex];
  if (!mask) throw new Error(`face role ${role.id} points to a missing mask`);
  return { role, mask, score: best ? best.score : 0 };
}

export function buildVariant(data: FaceData, context: Pick<FaceResolutionContext, "name" | "wish" | "choices">, role: FaceRole): FaceVariant {
  const seed = [context.name, context.wish, ...(context.choices || []), role.id].join("|");
  const hues = ["ash", "ochre", "vermilion", "indigo"] as const;
  const marks = ["隐纹", "额印", "眼缘", "边饰"] as const;
  const visual = data.masks[role.maskIndex]?.visual;
  if (!visual) throw new Error(`face role ${role.id} points to a missing mask`);
  // Preserve the legacy precedence: the mask's canonical tint is authoritative
  // over the deterministic fallback hue.
  return Object.assign({
    seed: seededIndex(seed, 1000000),
    tint: hues[seededIndex(seed + "t", hues.length)],
    mark: marks[seededIndex(seed + "m", marks.length)]
  }, visual);
}

export function chineseCount(text: string): number {
  return (String(text || "").match(HAN) || []).length;
}

export type { FaceData, FaceMask, FaceRole, FaceRoleKind } from "./data";
