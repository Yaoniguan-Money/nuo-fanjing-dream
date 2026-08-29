export const CODEX_VERSION = 2 as const;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface CodexEntryInput {
  mask?: {
    id?: unknown;
    name?: unknown;
    asset?: unknown;
    visual?: unknown;
  };
  role?: {
    id?: unknown;
    name?: unknown;
    duty?: unknown;
    kind?: unknown;
    signs?: unknown;
    background?: unknown;
  };
  variant?: unknown;
  visualText?: unknown;
  reasonText?: unknown;
  sources?: unknown;
  omen?: {
    status?: unknown;
    qian?: unknown;
    jie?: unknown;
    grade?: unknown;
    interpretation?: unknown;
    reflection?: unknown;
  };
  collectedAt?: unknown;
}

export interface CodexEntry {
  version: typeof CODEX_VERSION;
  mask: {
    id: string;
    name: string;
    asset: string;
    visual: Record<string, unknown>;
  };
  role: {
    id: string;
    name: string;
    duty: string;
    kind: string;
    signs: string[];
    background: string;
  };
  variant: Record<string, unknown>;
  visualText: string;
  reasonText: string;
  sources: CodexSource[];
  omen: {
    status: string;
    qian: string;
    jie: string;
    grade: string;
    interpretation: string;
    reflection: string;
  };
  collectedAt: string;
  updatedAt: string;
}

export interface CodexSource {
  id: string;
  title: string;
  institution: string;
  url: string;
  accessedAt: string;
  meaning: string;
  imageRights: string;
}

export interface CodexCollection {
  list(key: string): Record<string, CodexEntry>;
  get(key: string, maskId: string): CodexEntry | null;
  upsert(key: string, entry: CodexEntryInput): { ok: boolean; entry: CodexEntry | null };
  clear(key: string): boolean;
  normalize(entry: CodexEntryInput): CodexEntry | null;
}

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const asString = (value: unknown, fallback = ""): string => String(value ?? fallback);
const asFiniteNumber = (value: unknown, fallback: number): number => typeof value === "number" && Number.isFinite(value) ? value : fallback;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function cleanSource(source: unknown): CodexSource {
  const value = isRecord(source) ? source : {};
  return {
    id: asString(value.id),
    title: asString(value.title),
    institution: asString(value.institution),
    url: asString(value.url),
    accessedAt: asString(value.accessedAt),
    meaning: asString(value.meaning),
    imageRights: asString(value.imageRights)
  };
}

function cleanVisual(visual: unknown): Record<string, unknown> {
  const value = isRecord(visual) ? visual : {};
  const card = isRecord(value.card) ? value.card : {};
  const relief = isRecord(value.relief) ? value.relief : {};
  return {
    tint: asString(value.tint),
    pattern: asString(value.pattern),
    emblem: asString(value.emblem),
    card: {
      primary: asString(card.primary),
      secondary: asString(card.secondary),
      glyph: asString(card.glyph)
    },
    relief: {
      depth: asFiniteNumber(relief.depth, 0),
      resolution: asFiniteNumber(relief.resolution, 0),
      threshold: asFiniteNumber(relief.threshold, 0)
    }
  };
}

function cleanVariant(variant: unknown): Record<string, unknown> {
  const value = isRecord(variant) ? variant : {};
  // Keep only the deterministic visual result. In particular, do not spread an
  // arbitrary client object into persisted data: wish, portrait, media and API
  // configuration all belong to the transient session, not the codex.
  return {
    seed: asFiniteNumber(value.seed, 0),
    tint: asString(value.tint),
    mark: asString(value.mark),
    ...cleanVisual(value)
  };
}

function empty(): { version: typeof CODEX_VERSION; entries: Record<string, CodexEntry> } {
  return { version: CODEX_VERSION, entries: {} };
}

function normalizeEntry(entry: CodexEntryInput, now = new Date().toISOString()): CodexEntry | null {
  if (!entry || !entry.mask || !entry.role || !entry.mask.id) return null;
  const mask = entry.mask;
  const role = entry.role;
  return {
    version: CODEX_VERSION,
    mask: { id: asString(mask.id), name: asString(mask.name, "未命名面具"), asset: asString(mask.asset), visual: cleanVisual(mask.visual) },
    role: {
      id: asString(role.id), name: asString(role.name), duty: asString(role.duty), kind: asString(role.kind, "project_creation"),
      signs: Array.isArray(role.signs) ? role.signs.map((sign) => asString(sign)) : [], background: asString(role.background)
    },
    variant: cleanVariant(entry.variant),
    visualText: asString(entry.visualText),
    reasonText: asString(entry.reasonText),
    sources: Array.isArray(entry.sources) ? entry.sources.map(cleanSource) : [],
    omen: {
      status: asString(entry.omen?.status, "idle"),
      qian: asString(entry.omen?.qian, "神意正在成形"),
      jie: asString(entry.omen?.jie, "傩解尚未成形。"),
      grade: asString(entry.omen?.grade),
      interpretation: asString(entry.omen?.interpretation),
      reflection: asString(entry.omen?.reflection)
    },
    collectedAt: asString(entry.collectedAt, now),
    updatedAt: now
  };
}

function read(storage: StorageLike, key: string): { version: typeof CODEX_VERSION; entries: Record<string, CodexEntry> } {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(key) || "null");
    if (!isRecord(parsed) || parsed.version !== CODEX_VERSION || !isRecord(parsed.entries)) return empty();
    const entries: Record<string, CodexEntry> = {};
    for (const [maskId, value] of Object.entries(parsed.entries)) {
      const normalized = normalizeEntry(value as CodexEntryInput, isRecord(value) ? asString(value.updatedAt, new Date().toISOString()) : new Date().toISOString());
      if (normalized && normalized.mask.id === maskId) entries[maskId] = normalized;
    }
    return { version: CODEX_VERSION, entries };
  } catch {
    return empty();
  }
}

function write(storage: StorageLike, key: string, data: { version: typeof CODEX_VERSION; entries: Record<string, CodexEntry> }): boolean {
  try {
    storage.setItem(key, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function createCodexCollection(storage: StorageLike): CodexCollection {
  return {
    list(key) {
      return clone(read(storage, key).entries);
    },
    get(key, maskId) {
      const entry = read(storage, key).entries[maskId];
      return entry ? clone(entry) : null;
    },
    upsert(key, entry) {
      const normalized = normalizeEntry(entry);
      if (!normalized) return { ok: false, entry: null };
      const data = read(storage, key);
      const prior = data.entries[normalized.mask.id];
      if (prior?.collectedAt) normalized.collectedAt = prior.collectedAt;
      data.entries[normalized.mask.id] = normalized;
      return { ok: write(storage, key, data), entry: clone(normalized) };
    },
    clear(key) {
      try {
        storage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    },
    normalize: normalizeEntry
  };
}

export { normalizeEntry as normalizeCodexEntry };
