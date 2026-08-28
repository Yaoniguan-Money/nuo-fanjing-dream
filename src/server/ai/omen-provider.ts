import { createHash } from "node:crypto";
import { z } from "zod";
import type { DreamAiProviderId } from "./provider";

export const MAX_BODY_BYTES = 8_192;
export const CACHE_LIMIT = 96;
export const PROMPT_VERSION = "nuo-omen-v1";

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-v4-flash";
const HAN_ONLY = /^[\u3400-\u9fff]{8,12}$/u;
const BANNED_GUIDANCE = ["保证", "必然", "一定会", "治愈", "诊断", "处方", "投资", "中奖", "吉凶"] as const;
const REPAIRABLE_ERRORS = new Set(["AI_INVALID_QIAN", "AI_INVALID_JIE", "AI_UNSAFE_GUIDANCE", "AI_INVALID_JSON"]);

export class OmenError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 502) {
    super(message);
    this.name = "OmenError";
    this.code = code;
    this.status = status;
  }
}

const roleSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  duty: z.string().trim().min(1),
  reason: z.string().trim().min(1),
  kind: z.string().trim().min(1)
}).passthrough();

const evidenceSchema = z.object({
  signs: z.array(z.unknown())
}).passthrough();

export const omenInputSchema = z.object({
  request_id: z.string().trim().max(200).optional(),
  wish: z.string().trim().min(1).max(300),
  choices: z.tuple([z.union([z.literal(0), z.literal(1)]), z.union([z.literal(0), z.literal(1)]), z.union([z.literal(0), z.literal(1)])]),
  role: roleSchema,
  evidence: evidenceSchema
}).strict();

export type OmenContext = z.infer<typeof omenInputSchema> & { request_id: string };

export const omenTextSchema = z.object({
  qian: z.string(),
  jie: z.string()
}).passthrough();

export const omenResponseSchema = z.object({
  qian: z.string().regex(HAN_ONLY),
  jie: z.string(),
  meta: z.object({
    model: z.string().min(1),
    prompt_version: z.literal(PROMPT_VERSION),
    request_id: z.string().min(1)
  }).strict()
}).strict();

type OmenText = { qian: string; jie: string };
type OmenResult = z.infer<typeof omenResponseSchema>;

const omenCache = new Map<string, OmenResult>();

function chineseCount(value: string): number {
  return [...value].filter((character) => /[\u3400-\u9fff]/u.test(character)).length;
}

export function validateOmen(payload: unknown): OmenText {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new OmenError("AI_INVALID_JSON", "傩引没有返回可读取的文字。");
  }
  const parsed = omenTextSchema.safeParse(payload);
  if (!parsed.success) {
    throw new OmenError("AI_INVALID_JSON", "傩引返回的文字无法结成签文。");
  }
  const { qian, jie } = parsed.data;
  if (!HAN_ONLY.test(qian.trim())) {
    throw new OmenError("AI_INVALID_QIAN", "傩签未满足八至十二个汉字的格式。");
  }
  const normalizedJie = jie.trim();
  if (chineseCount(normalizedJie) < 70 || chineseCount(normalizedJie) > 120) {
    throw new OmenError("AI_INVALID_JIE", "傩解长度未满足本次仪式的限制。");
  }
  if (BANNED_GUIDANCE.some((term) => normalizedJie.includes(term))) {
    throw new OmenError("AI_UNSAFE_GUIDANCE", "傩解出现了不适合本体验的承诺或建议。");
  }
  return { qian: qian.trim(), jie: normalizedJie };
}

export function validateOmenInput(payload: unknown): OmenContext {
  const parsed = omenInputSchema.safeParse(payload);
  if (!parsed.success) {
    throw new OmenError("INVALID_REQUEST", "愿望、三幕选择、职司或授面证据不完整。", 400);
  }
  return {
    ...parsed.data,
    request_id: parsed.data.request_id || `local-${Date.now()}`
  };
}

function readConfig(): { apiKey: string; baseUrl: string; model: string } {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim() ?? "";
  if (!apiKey) {
    throw new OmenError("AI_NOT_CONFIGURED", "本地服务尚未配置 DeepSeek API Key。", 503);
  }
  return {
    apiKey,
    baseUrl: (process.env.DEEPSEEK_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/u, ""),
    model: process.env.DEEPSEEK_MODEL?.trim() || DEFAULT_MODEL
  };
}

function readResponseText(response: Record<string, unknown>): string {
  if (typeof response.output_text === "string") return response.output_text;
  const output = Array.isArray(response.output) ? response.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as { content?: unknown }).content) ? (item as { content: unknown[] }).content : [];
    for (const entry of content) {
      if (!entry || typeof entry !== "object") continue;
      const value = entry as { type?: unknown; text?: unknown };
      if (value.type === "output_text" && typeof value.text === "string") return value.text;
    }
  }
  throw new OmenError("AI_EMPTY_RESPONSE", "傩引没有返回文字。");
}

function responseError(status: number): OmenError {
  if (status === 401 || status === 403) return new OmenError("AI_AUTH_FAILED", "DeepSeek API Key 无效或无权访问。");
  if (status === 429) return new OmenError("AI_RATE_LIMITED", "傩引此刻应答过多，请稍后重新求签。", 429);
  return new OmenError("AI_UPSTREAM_ERROR", "傩引暂时无法回应，请稍后重新求签。");
}

async function requestUpstream(context: OmenContext, repairNote?: string): Promise<OmenText> {
  const { apiKey, baseUrl, model } = readConfig();
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: { qian: { type: "string" }, jie: { type: "string" } },
    required: ["qian", "jie"]
  };
  const body = {
    model,
    instructions: "你是《大傩幻梦》的傩引。只生成中文 json，不生成文化史事实，不承诺现实结果。qian 必须是无标点的 8 到 12 个汉字；jie 必须有 70 到 120 个汉字，保持含混、有投射空间，且不得包含保证、必然、一定会、治愈、诊断、处方、投资、中奖或吉凶。",
    input: JSON.stringify({ wish: context.wish, choices: context.choices, role: context.role, evidence: context.evidence, repair_note: repairNote }, null, 0),
    reasoning: { effort: "none" },
    max_output_tokens: 350,
    text: { format: { type: "json_schema", name: "nuo_omen", schema, strict: true } }
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/responses`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch {
    throw new OmenError("AI_UNAVAILABLE", "无法连接傩引，请检查网络后重新求签。", 504);
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) throw responseError(response.status);
  let envelope: unknown;
  try {
    envelope = await response.json();
  } catch {
    throw new OmenError("AI_INVALID_JSON", "傩引返回的文字无法结成签文。");
  }
  let text: string;
  try {
    text = readResponseText(envelope as Record<string, unknown>);
  } catch (error) {
    if (error instanceof OmenError) throw error;
    throw new OmenError("AI_INVALID_JSON", "傩引返回的文字无法结成签文。");
  }
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new OmenError("AI_INVALID_JSON", "傩引返回的文字无法结成签文。");
  }
  return validateOmen(payload);
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function cacheKey(context: OmenContext, model: string): string {
  return createHash("sha256").update(stableSerialize({ v: PROMPT_VERSION, m: model, c: context })).digest("hex");
}

export function clearOmenCache(): void {
  omenCache.clear();
}

export async function generateOmen(context: OmenContext): Promise<OmenResult> {
  const model = process.env.DEEPSEEK_MODEL?.trim() || DEFAULT_MODEL;
  const key = cacheKey(context, model);
  const cached = omenCache.get(key);
  if (cached) {
    omenCache.delete(key);
    omenCache.set(key, cached);
    return cached;
  }
  let omen: OmenText;
  try {
    omen = await requestUpstream(context);
  } catch (error) {
    if (!(error instanceof OmenError) || !REPAIRABLE_ERRORS.has(error.code)) throw error;
    omen = await requestUpstream(context, "上一次输出未通过格式或安全校验。请仅输出符合 schema 的 json。");
  }
  const result = omenResponseSchema.parse({
    ...omen,
    meta: { model, prompt_version: PROMPT_VERSION, request_id: context.request_id }
  });
  omenCache.set(key, result);
  while (omenCache.size > CACHE_LIMIT) {
    const oldest = omenCache.keys().next().value;
    if (oldest === undefined) break;
    omenCache.delete(oldest);
  }
  return result;
}

export const deepseekOmenProvider: {
  readonly id: DreamAiProviderId;
  generate(context: OmenContext): Promise<OmenResult>;
} = {
  id: "deepseek-omen",
  generate: generateOmen
};
