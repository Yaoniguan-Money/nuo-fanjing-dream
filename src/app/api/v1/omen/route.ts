import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { MAX_BODY_BYTES, OmenError, deepseekOmenProvider, validateOmenInput } from "@/server/ai/omen-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: OmenError): NextResponse {
  return NextResponse.json({ code: error.code, message: error.message }, { status: error.status });
}

async function readBody(request: Request): Promise<string> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null && (!/^\d+$/u.test(declaredLength) || Number(declaredLength) > MAX_BODY_BYTES)) {
    throw new OmenError("INVALID_REQUEST", "请求体大小不正确。", 413);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new OmenError("INVALID_REQUEST", "请求体大小不正确。", 413);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new OmenError("INVALID_REQUEST", "请求体大小不正确。", 413);
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  if (body.byteLength === 0) throw new OmenError("INVALID_REQUEST", "请求体大小不正确。", 413);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    throw new OmenError("INVALID_REQUEST", "请求不是合法 JSON。", 400);
  }
}

function logRequestId(requestId: string): string {
  return createHash("sha256").update(requestId).digest("hex").slice(0, 12);
}

export async function POST(request: Request): Promise<NextResponse> {
  const started = performance.now();
  let requestId = "unknown";
  let status = "internal_error";
  try {
    const rawBody = await readBody(request);
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new OmenError("INVALID_REQUEST", "请求不是合法 JSON。", 400);
    }
    const context = validateOmenInput(payload);
    requestId = context.request_id;
    const result = await deepseekOmenProvider.generate(context);
    status = "ok";
    return NextResponse.json(result, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof OmenError) {
      status = error.code;
      return errorResponse(error);
    }
    return NextResponse.json({ code: "INTERNAL_ERROR", message: "本地傩引发生未预期错误。" }, { status: 500 });
  } finally {
    console.info(`[NUO] omen request_id_hash=${logRequestId(requestId)} status=${status} elapsed_ms=${Math.round(performance.now() - started)}`);
  }
}
