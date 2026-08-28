"""Local-only server for the Nuo experience and its DeepSeek omen proxy."""

from __future__ import annotations

from collections import OrderedDict
import contextlib
import hashlib
import json
import os
from pathlib import Path
import re
import socket
import threading
import time
import webbrowser
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib import error, request

BUILD = "20260828-codex-v1"
ROOT = Path(__file__).resolve().parent
MAX_BODY_BYTES = 8_192
CACHE_LIMIT = 96
PROMPT_VERSION = "nuo-omen-v1"
HAN_ONLY = re.compile(r"^[\u3400-\u9fff]{8,12}$")
BANNED_GUIDANCE = ("保证", "必然", "一定会", "治愈", "诊断", "处方", "投资", "中奖", "吉凶")
OMEN_CACHE: OrderedDict[str, dict[str, Any]] = OrderedDict()


class OmenError(Exception):
    def __init__(self, code: str, message: str, status: HTTPStatus = HTTPStatus.BAD_GATEWAY):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


def load_local_env() -> None:
    """Fill only known unset variables from an ignored local file."""
    allowed = {"DEEPSEEK_API_KEY", "DEEPSEEK_BASE_URL", "DEEPSEEK_MODEL"}
    env_file = ROOT / ".env.local"
    if not env_file.exists():
        return
    for raw_line in env_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if key in allowed and not os.getenv(key):
            os.environ[key] = value.strip().strip('"').strip("'")


def chinese_count(value: str) -> int:
    return len(re.findall(r"[\u3400-\u9fff]", value))


def validate_omen(payload: Any) -> dict[str, str]:
    if not isinstance(payload, dict):
        raise OmenError("AI_INVALID_JSON", "傩引没有返回可读取的文字。")
    qian = str(payload.get("qian", "")).strip()
    jie = str(payload.get("jie", "")).strip()
    if not HAN_ONLY.fullmatch(qian):
        raise OmenError("AI_INVALID_QIAN", "傩签未满足八至十二个汉字的格式。")
    if not 70 <= chinese_count(jie) <= 120:
        raise OmenError("AI_INVALID_JIE", "傩解长度未满足本次仪式的限制。")
    if any(term in jie for term in BANNED_GUIDANCE):
        raise OmenError("AI_UNSAFE_GUIDANCE", "傩解出现了不适合本体验的承诺或建议。")
    return {"qian": qian, "jie": jie}


def validate_input(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise OmenError("INVALID_REQUEST", "请求格式不正确。", HTTPStatus.BAD_REQUEST)
    wish = str(payload.get("wish", "")).strip()
    choices = payload.get("choices")
    role = payload.get("role")
    evidence = payload.get("evidence")
    request_id = str(payload.get("request_id", "")).strip()
    if not wish or len(wish) > 300 or not isinstance(choices, list) or len(choices) != 3:
        raise OmenError("INVALID_REQUEST", "愿望或三幕选择不完整。", HTTPStatus.BAD_REQUEST)
    if any(choice not in (0, 1) for choice in choices):
        raise OmenError("INVALID_REQUEST", "三幕选择格式不正确。", HTTPStatus.BAD_REQUEST)
    required_role = ("id", "name", "duty", "reason", "kind")
    if not isinstance(role, dict) or not all(isinstance(role.get(key), str) and role[key].strip() for key in required_role):
        raise OmenError("INVALID_REQUEST", "职司上下文不完整。", HTTPStatus.BAD_REQUEST)
    if not isinstance(evidence, dict) or not isinstance(evidence.get("signs"), list):
        raise OmenError("INVALID_REQUEST", "授面证据不完整。", HTTPStatus.BAD_REQUEST)
    return {"request_id": request_id or f"local-{int(time.time() * 1000)}", "wish": wish, "choices": choices, "role": role, "evidence": evidence}


def read_response_text(response: dict[str, Any]) -> str:
    if isinstance(response.get("output_text"), str):
        return response["output_text"]
    for item in response.get("output", []):
        for content in item.get("content", []):
            if content.get("type") == "output_text" and isinstance(content.get("text"), str):
                return content["text"]
    raise OmenError("AI_EMPTY_RESPONSE", "傩引没有返回文字。")


def deepseek_request(context: dict[str, Any], repair_note: str | None = None) -> dict[str, str]:
    api_key = os.getenv("DEEPSEEK_API_KEY", "").strip()
    if not api_key:
        raise OmenError("AI_NOT_CONFIGURED", "本地服务尚未配置 DeepSeek API Key。", HTTPStatus.SERVICE_UNAVAILABLE)
    base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com").rstrip("/")
    model = os.getenv("DEEPSEEK_MODEL", "deepseek-v4-flash")
    schema = {"type": "object", "additionalProperties": False, "properties": {"qian": {"type": "string"}, "jie": {"type": "string"}}, "required": ["qian", "jie"]}
    body = {
        "model": model,
        "instructions": "你是《大傩幻梦》的傩引。只生成中文 json，不生成文化史事实，不承诺现实结果。qian 必须是无标点的 8 到 12 个汉字；jie 必须有 70 到 120 个汉字，保持含混、有投射空间，且不得包含保证、必然、一定会、治愈、诊断、处方、投资、中奖或吉凶。",
        "input": json.dumps({"wish": context["wish"], "choices": context["choices"], "role": context["role"], "evidence": context["evidence"], "repair_note": repair_note}, ensure_ascii=False),
        "reasoning": {"effort": "none"},
        "max_output_tokens": 350,
        "text": {"format": {"type": "json_schema", "name": "nuo_omen", "schema": schema, "strict": True}},
    }
    outgoing = request.Request(f"{base_url}/responses", data=json.dumps(body, ensure_ascii=False).encode("utf-8"), headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}, method="POST")
    try:
        with request.urlopen(outgoing, timeout=30) as upstream:
            response = json.loads(upstream.read().decode("utf-8"))
    except error.HTTPError as exc:
        if exc.code in (401, 403):
            raise OmenError("AI_AUTH_FAILED", "DeepSeek API Key 无效或无权访问。") from exc
        if exc.code == 429:
            raise OmenError("AI_RATE_LIMITED", "傩引此刻应答过多，请稍后重新求签。", HTTPStatus.TOO_MANY_REQUESTS) from exc
        raise OmenError("AI_UPSTREAM_ERROR", "傩引暂时无法回应，请稍后重新求签。") from exc
    except (error.URLError, TimeoutError) as exc:
        raise OmenError("AI_UNAVAILABLE", "无法连接傩引，请检查网络后重新求签。", HTTPStatus.GATEWAY_TIMEOUT) from exc
    try:
        return validate_omen(json.loads(read_response_text(response)))
    except json.JSONDecodeError as exc:
        raise OmenError("AI_INVALID_JSON", "傩引返回的文字无法结成签文。") from exc


def generate_omen(context: dict[str, Any]) -> dict[str, Any]:
    cache_input = json.dumps({"v": PROMPT_VERSION, "m": os.getenv("DEEPSEEK_MODEL", "deepseek-v4-flash"), "c": context}, ensure_ascii=False, sort_keys=True)
    cache_key = hashlib.sha256(cache_input.encode("utf-8")).hexdigest()
    if cache_key in OMEN_CACHE:
        OMEN_CACHE.move_to_end(cache_key)
        return OMEN_CACHE[cache_key]
    try:
        omen = deepseek_request(context)
    except OmenError as first_error:
        if first_error.code not in {"AI_INVALID_QIAN", "AI_INVALID_JIE", "AI_UNSAFE_GUIDANCE", "AI_INVALID_JSON"}:
            raise
        omen = deepseek_request(context, "上一次输出未通过格式或安全校验。请仅输出符合 schema 的 json。")
    result = {**omen, "meta": {"model": os.getenv("DEEPSEEK_MODEL", "deepseek-v4-flash"), "prompt_version": PROMPT_VERSION, "request_id": context["request_id"]}}
    OMEN_CACHE[cache_key] = result
    if len(OMEN_CACHE) > CACHE_LIMIT:
        OMEN_CACHE.popitem(last=False)
    return result


class NuoHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.send_header("X-Nuo-Build", BUILD)
        super().end_headers()

    def log_message(self, fmt: str, *args: Any) -> None:
        print("[NUO]", fmt % args)

    def send_json(self, status: HTTPStatus, body: dict[str, Any]) -> None:
        raw = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_POST(self) -> None:
        if self.path.split("?", 1)[0] != "/api/v1/omen":
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        started, request_id, status = time.perf_counter(), "unknown", "internal_error"
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= MAX_BODY_BYTES:
                raise OmenError("INVALID_REQUEST", "请求体大小不正确。", HTTPStatus.REQUEST_ENTITY_TOO_LARGE)
            context = validate_input(json.loads(self.rfile.read(length).decode("utf-8")))
            request_id = context["request_id"]
            self.send_json(HTTPStatus.OK, generate_omen(context))
            status = "ok"
        except json.JSONDecodeError:
            self.send_json(HTTPStatus.BAD_REQUEST, {"code": "INVALID_REQUEST", "message": "请求不是合法 JSON。"})
            status = "invalid_json"
        except OmenError as exc:
            self.send_json(exc.status, {"code": exc.code, "message": exc.message})
            status = exc.code
        except Exception:
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"code": "INTERNAL_ERROR", "message": "本地傩引发生未预期错误。"})
        print(f"[NUO] omen request_id={request_id} status={status} elapsed_ms={round((time.perf_counter() - started) * 1000)}")


def free_port() -> int:
    with contextlib.closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


if __name__ == "__main__":
    load_local_env()
    os.chdir(ROOT)
    port = free_port()
    url = f"http://127.0.0.1:{port}/index.html?build={BUILD}"
    httpd = ThreadingHTTPServer(("127.0.0.1", port), NuoHandler)
    print("NUO GET-FACE LOCAL SERVER")
    print("URL:", url)
    print("DeepSeek configured:", bool(os.getenv("DEEPSEEK_API_KEY")))
    threading.Timer(0.45, lambda: webbrowser.open(url)).start()
    httpd.serve_forever()
