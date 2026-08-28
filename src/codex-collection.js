(function (root) {
  "use strict";

  const VERSION = 2;
  const clone = (value) => JSON.parse(JSON.stringify(value));

  function empty() { return { version: VERSION, entries: {} }; }

  function read(key) {
    try {
      const parsed = JSON.parse(root.localStorage.getItem(key) || "null");
      if (!parsed || parsed.version !== VERSION || typeof parsed.entries !== "object") return empty();
      return { version: VERSION, entries: parsed.entries };
    } catch (_) {
      return empty();
    }
  }

  function write(key, data) {
    try { root.localStorage.setItem(key, JSON.stringify(data)); return true; }
    catch (_) { return false; }
  }

  function cleanSource(source) {
    return {
      id: String(source.id || ""), title: String(source.title || ""), institution: String(source.institution || ""),
      url: String(source.url || ""), accessedAt: String(source.accessedAt || ""), meaning: String(source.meaning || ""), imageRights: String(source.imageRights || "")
    };
  }

  // This boundary intentionally omits wish text, portrait state, media and API metadata.
  function normalize(entry) {
    if (!entry || !entry.mask || !entry.role || !entry.mask.id) return null;
    const now = new Date().toISOString();
    return {
      version: VERSION,
      mask: { id: String(entry.mask.id), name: String(entry.mask.name || "未命名面具"), asset: String(entry.mask.asset || ""), visual: clone(entry.mask.visual || {}) },
      role: { id: String(entry.role.id || ""), name: String(entry.role.name || ""), duty: String(entry.role.duty || ""), kind: String(entry.role.kind || "project_creation"), signs: Array.isArray(entry.role.signs) ? entry.role.signs.map(String) : [], background: String(entry.role.background || "") },
      variant: clone(entry.variant || {}),
      visualText: String(entry.visualText || ""),
      reasonText: String(entry.reasonText || ""),
      sources: Array.isArray(entry.sources) ? entry.sources.map(cleanSource) : [],
      omen: { status: String(entry.omen?.status || "idle"), qian: String(entry.omen?.qian || "神意正在成形"), jie: String(entry.omen?.jie || "傩解尚未成形。") },
      collectedAt: String(entry.collectedAt || now),
      updatedAt: now
    };
  }

  function list(key) { return clone(read(key).entries); }
  function get(key, maskId) { const entry = read(key).entries[maskId]; return entry ? clone(entry) : null; }
  function upsert(key, entry) {
    const normalized = normalize(entry);
    if (!normalized) return { ok: false, entry: null };
    const data = read(key);
    const prior = data.entries[normalized.mask.id];
    if (prior?.collectedAt) normalized.collectedAt = prior.collectedAt;
    data.entries[normalized.mask.id] = normalized;
    return { ok: write(key, data), entry: clone(normalized) };
  }
  function clear(key) {
    try { root.localStorage.removeItem(key); return true; }
    catch (_) { return false; }
  }

  root.NuoCodexCollection = { VERSION, list, get, upsert, clear, normalize };
})(window);
