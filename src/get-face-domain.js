(function (root) {
  "use strict";

  const HAN = /[\u3400-\u9fff]/g;
  function clean(value) { return String(value || "").trim().toLowerCase(); }
  function countHits(text, tokens) {
    const normalized = clean(text);
    return (tokens || []).reduce((score, token) => score + (normalized.includes(clean(token)) ? 1 : 0), 0);
  }
  function seededIndex(seed, size) {
    let hash = 2166136261;
    for (const char of String(seed || "")) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
    return Math.abs(hash >>> 0) % Math.max(size, 1);
  }
  function resolveVisual(data, wish) {
    const scores = data.masks.map((mask) => countHits(wish, mask.themes));
    const best = Math.max(...scores);
    return best > 0 ? scores.indexOf(best) : 3;
  }
  function resolveRole(data, context) {
    const forcedMask = Number.isInteger(context.maskIndex) ? context.maskIndex : resolveVisual(data, context.wish);
    const choices = Array.isArray(context.choices) ? context.choices : [];
    const candidates = data.roles.filter((role) => role.maskIndex === forcedMask && role.id !== "neutral-questioner");
    const scored = candidates.map((role) => ({
      role,
      score: countHits(context.wish, role.triggers) + choices.reduce((total, choice, index) => total + (choice === 0 ? Number(role.choiceWeights[index] || 0) : 0), 0)
    }));
    const best = scored.reduce((winner, entry) => !winner || entry.score > winner.score ? entry : winner, null);
    const role = !best || best.score <= 0 ? data.roles.find((entry) => entry.id === "neutral-questioner") : best.role;
    return { role, mask: data.masks[role.maskIndex], score: best ? best.score : 0 };
  }
  function buildVariant(data, context, role) {
    const seed = [context.name, context.wish, ...(context.choices || []), role.id].join("|");
    const hues = ["ash", "ochre", "vermilion", "indigo"];
    const marks = ["隐纹", "额印", "眼缘", "边饰"];
    return { seed: seededIndex(seed, 1000000), tint: hues[seededIndex(seed + "t", hues.length)], mark: marks[seededIndex(seed + "m", marks.length)], ...data.masks[role.maskIndex].visual };
  }
  function chineseCount(text) { return (String(text || "").match(HAN) || []).length; }
  root.NuoGetFaceDomain = { resolveVisual, resolveRole, buildVariant, chineseCount };
})(window);
