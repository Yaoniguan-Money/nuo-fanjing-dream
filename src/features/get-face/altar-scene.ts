export const ALTAR_MASK_INDICES = [0, 2, 1, 3, 0, 1, 2] as const;

export const ALTAR_SCENE_PHASES = [
  "selecting",
  "spinning",
  "ejecting",
  "revealing",
  "impact",
  "blackout"
] as const;

export type AltarScenePhase = (typeof ALTAR_SCENE_PHASES)[number];

export interface AltarOrbitPose {
  x: number;
  y: number;
  scale: number;
  opacity: number;
  rotation: number;
  zIndex: number;
}

export interface AltarSceneViewport {
  width: number;
  height: number;
}

const ORBIT_RADIUS_X = 37;
const ORBIT_RADIUS_Y = 26;

/**
 * Finds the first visual slot for a mask. Duplicate slots are deliberate: the
 * chosen slot is singular, while every other slot remains available to eject.
 */
export function firstAltarSlotForMask(maskIndex: number): number {
  return ALTAR_MASK_INDICES.findIndex((candidate) => candidate === maskIndex);
}

/**
 * Pure orbit math keeps the scene deterministic and easy to test without a
 * browser, RAF, GSAP, audio, or WebGL runtime.
 */
export function altarOrbitPose(slot: number, angle: number, viewport: AltarSceneViewport): AltarOrbitPose {
  const safeWidth = Math.max(viewport.width, 1);
  const safeHeight = Math.max(viewport.height, 1);
  const normalizedSlot = Number.isFinite(slot) ? slot : 0;
  const normalizedAngle = Number.isFinite(angle) ? angle : 0;
  const depth = (Math.sin(normalizedAngle + normalizedSlot * 0.9) + 1) / 2;
  const x = (Math.cos(normalizedAngle + normalizedSlot * 0.9) * ORBIT_RADIUS_X * safeWidth) / 100;
  const y = (Math.sin(normalizedAngle + normalizedSlot * 0.9) * ORBIT_RADIUS_Y * safeHeight) / 100;
  return {
    x,
    y,
    scale: 0.62 + depth * 0.34,
    opacity: 0.26 + depth * 0.48,
    rotation: Math.sin(normalizedAngle + normalizedSlot) * 8,
    zIndex: 8 + Math.round(depth * 12)
  };
}

export function altarPhaseAt(elapsedMs: number): AltarScenePhase {
  const elapsed = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0);
  if (elapsed < 240) return "selecting";
  if (elapsed < 1_740) return "spinning";
  if (elapsed < 2_200) return "ejecting";
  if (elapsed < 2_940) return "revealing";
  if (elapsed < 3_640) return "impact";
  return "blackout";
}

export function nextAltarScenePhase(phase: AltarScenePhase): AltarScenePhase | null {
  const nextIndex = ALTAR_SCENE_PHASES.indexOf(phase) + 1;
  return ALTAR_SCENE_PHASES[nextIndex] ?? null;
}
