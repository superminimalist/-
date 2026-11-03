"""YouTube 트랜스크립트 — 링크 붙여넣기 → 자막(있으면) 또는 Whisper 받아쓰기.

python app.py                      # 웹 UI (http://127.0.0.1:8765)
python app.py <url> -l fa -f srt   # CLI
"""

import argparse
import html
import http.cookiejar
import json
import os
import re
import sys
import tempfile
import threading
import time
import traceback
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import requests

HERE = Path(__file__).resolve().parent

# UN 공용어 6개 + fa/hi/ur
LANGS: dict[str, dict] = {
    "en": {"name": "English", "rtl": False},
    "ar": {"name": "العربية", "rtl": True},
    "zh": {"name": "中文", "rtl": False},
    "fr": {"name": "Français", "rtl": False},
    "ru": {"name": "Русский", "rtl": False},
    "es": {"name": "Español", "rtl": False},
    "fa": {"name": "فارسی", "rtl": True},
    "hi": {"name": "हिन्दी", "rtl": False},
    "ur": {"name": "اردو", "rtl": True},
}
# 유튜브 자동번역 대상 코드
TRANSLATE_CODE = {"zh": "zh-Hans"}
# Whisper 문자체계 유도 (중국어 간체, 우르두를 아랍어/힌디로 새지 않게 등)
WHISPER_PROMPT = {
    "zh": "以下是普通话的句子。",
    "ur": "یہ اردو میں گفتگو ہے۔",
    "fa": "این یک گفتگو به زبان فارسی است.",
    "hi": "यह हिंदी में बातचीत है।",
    "ar": "هذا حديث باللغة العربية.",
}
MODELS = ["large-v3-turbo", "large-v3", "medium", "small"]
DEFAULT_MODEL = os.environ.get("WHISPER_MODEL", "large-v3-turbo")
COOKIES_FILE = os.environ.get("YT_COOKIES_FILE") or (str(HERE / "cookies.txt") if (HERE / "cookies.txt").exists() else None)
COOKIES_BROWSER = os.environ.get("YT_COOKIES_BROWSER")  # chrome / firefox / edge ...
DATA_DIR = Path(os.environ.get("YTT_DATA_DIR") or HERE / "data")  # 완료된 결과 — 재시작해도 유지

_ID_RE = re.compile(r"(?:[?&]v=|/shorts/|/live/|/embed/|/v/|youtu\.be/)([A-Za-z0-9_-]{11})")


def parse_video_id(url: str) -> str:
    url = url.strip()
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", url):
        return url
    m = _ID_RE.search(url)
    if not m:
        raise ValueError("유튜브 링크에서 영상 ID를 찾지 못했습니다")
    return m.group(1)


def base_lang(code: str | None) -> str:
    return (code or "").split("-")[0].lower()


# ---------------------------------------------------------------- job state

class Job:
    def __init__(self, url: str, opts: dict):
        self.id = uuid.uuid4().hex[:10]
        self.url = url
        self.opts = opts
        self.status = "queued"  # queued | running | done | error
        self.stage = "대기 중"
        self.progress = 0.0
        self.log: list[str] = []
        self.error: str | None = None
        self.result: dict | None = None
        self.created = time.time()
        self.cancelled = False
        self._lock = threading.Lock()

    def cache_key(self) -> str:
        o = self.opts
        return f"{parse_video_id(self.url)}|{o['lang']}|{o['mode']}|{o['model']}|{int(bool(o['translate']))}"

    def save(self):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        d = self.public()
        d["opts"] = self.opts
        tmp = DATA_DIR / f"{self.id}.json.tmp"
        tmp.write_text(json.dumps(d, ensure_ascii=False), encoding="utf-8")
        tmp.replace(DATA_DIR / f"{self.id}.json")

    @classmethod
    def load(cls, path: Path) -> "Job":
        d = json.loads(path.read_text(encoding="utf-8"))
        j = cls(d["url"], d["opts"])
        j.id, j.created, j.result, j.log = d["id"], d["created"], d["result"], d.get("log", [])
        j.status, j.stage, j.progress = "done", "완료", 1.0
        return j

    def set(self, **kw):
        with self._lock:
            for k, v in kw.items():
                setattr(self, k, v)

    def say(self, msg: str):
        with self._lock:
            self.log.append(msg)

    def public(self, full: bool = True) -> dict:
        with self._lock:
            d = {
                "id": self.id, "url": self.url, "status": self.status, "stage": self.stage,
                "progress": round(self.progress, 4), "error": self.error, "created": self.created,
                "title": (self.result or {}).get("title"),
            }
            if full:
                d["log"] = list(self.log)
                d["result"] = self.result
            return d


JOBS: dict[str, Job] = {}
EXEC = ThreadPoolExecutor(max_workers=1)  # Whisper는 GPU/CPU 하나 — 순서대로


def load_saved_jobs():
    if not DATA_DIR.is_dir():
        return
    for f in DATA_DIR.glob("*.json"):
        try:
            j = Job.load(f)
            JOBS[j.id] = j
        except Exception as e:
            print(f"! {f.name} 읽기 실패: {e}", file=sys.stderr)


def find_cached(job: Job) -> Job | None:
    key = job.cache_key()
    for j in sorted(JOBS.values(), key=lambda j: -j.created):
        if j.status == "done" and j.cache_key() == key:
            return j
    return None


class Cancelled(Exception):
    pass


# ---------------------------------------------------------------- captions

def _http_session() -> requests.Session:
    s = requests.Session()
    if COOKIES_FILE:
        jar = http.cookiejar.MozillaCookieJar(COOKIES_FILE)
        jar.load(ignore_discard=True, ignore_expires=True)
        s.cookies = jar  # type: ignore[assignment]
    return s


def fetch_title(vid: str) -> str | None:
    try:
        r = requests.get("https://www.youtube.com/oembed",
                         params={"url": f"https://www.youtube.com/watch?v={vid}", "format": "json"}, timeout=10)
        return r.json().get("title") if r.ok else None
    except Exception:
        return None


class CaptionsBlocked(Exception):
    pass


def fetch_captions(vid: str, lang: str, allow_translate: bool, job: Job) -> dict | None:
    from youtube_transcript_api import (
        YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound, VideoUnavailable,
        RequestBlocked, IpBlocked, CouldNotRetrieveTranscript,
    )

    job.set(stage="자막 확인 중", progress=0.02)
    api = YouTubeTranscriptApi(http_client=_http_session())
    try:
        items = list(api.list(vid))
    except (TranscriptsDisabled, NoTranscriptFound):
        job.say("이 영상엔 자막이 없음")
        return None
    except VideoUnavailable:
        raise
    except (RequestBlocked, IpBlocked) as e:
        raise CaptionsBlocked("유튜브가 자막 요청을 차단함 (IP 차단 — 쿠키 설정 또는 Whisper 사용)") from e
    except CouldNotRetrieveTranscript as e:
        job.say(f"자막 목록 실패: {type(e).__name__}")
        return None

    job.say("자막 목록: " + (", ".join(f"{t.language_code}{'(자동)' if t.is_generated else ''}" for t in items) or "없음"))

    pick, source = None, None
    if lang == "auto":
        manual = [t for t in items if not t.is_generated]
        gen = [t for t in items if t.is_generated]
        if manual:
            pick, source = manual[0], "youtube-manual"
        elif gen:
            pick, source = gen[0], "youtube-auto"
    else:
        manual = [t for t in items if not t.is_generated and base_lang(t.language_code) == lang]
        gen = [t for t in items if t.is_generated and base_lang(t.language_code) == lang]
        if manual:
            pick, source = manual[0], "youtube-manual"
        elif gen:
            pick, source = gen[0], "youtube-auto"
        elif allow_translate:
            src = next((t for t in items if not t.is_generated and t.is_translatable), None) \
                or next((t for t in items if t.is_translatable), None)
            if src:
                try:
                    pick = src.translate(TRANSLATE_CODE.get(lang, lang))
                    source = f"youtube-translated:{src.language_code}"
                except Exception as e:
                    job.say(f"자동번역 불가: {type(e).__name__}")

    if pick is None:
        job.say(f"'{lang}' 자막 없음")
        return None

    job.set(stage="자막 내려받는 중", progress=0.5)
    try:
        raw = pick.fetch().to_raw_data()
    except (RequestBlocked, IpBlocked) as e:
        raise CaptionsBlocked("유튜브가 자막 요청을 차단함") from e

    segs = []
    for r in raw:
        text = html.unescape(r.get("text", "")).replace("\n", " ").strip()
        if text:
            start = float(r.get("start", 0))
            segs.append({"start": start, "end": start + float(r.get("duration", 0)), "text": text})
    if not segs:
        return None
    return {"segments": segs, "language": base_lang(pick.language_code) if lang == "auto" else lang,
            "source": source, "caption_code": pick.language_code}


# ---------------------------------------------------------------- whisper

_model_lock = threading.Lock()
_model: tuple[str, object] | None = None


def get_model(size: str, job: Job):
    global _model
    with _model_lock:
        if _model and _model[0] == size:
            return _model[1]
        from faster_whisper import WhisperModel
        import ctranslate2

        cuda = ctranslate2.get_cuda_device_count() > 0
        job.set(stage=f"Whisper {size} 로딩 ({'GPU' if cuda else 'CPU'})")
        job.say(f"모델 {size} · {'cuda float16' if cuda else 'cpu int8'} (첫 실행은 모델 다운로드)")
        _model = None
        m = WhisperModel(size, device="cuda" if cuda else "cpu",
                         compute_type="float16" if cuda else "int8",
                         cpu_threads=os.cpu_count() or 4)
        _model = (size, m)
        return m


def download_audio(vid: str, workdir: Path, job: Job) -> tuple[Path, dict]:
    import yt_dlp

    def hook(d):
        if d.get("status") == "downloading":
            tot = d.get("total_bytes") or d.get("total_bytes_estimate")
            if tot:
                job.set(progress=0.02 + 0.13 * d.get("downloaded_bytes", 0) / tot)
        if job.cancelled:
            raise Cancelled()

    opts = {
        "format": "bestaudio/best",
        "outtmpl": str(workdir / "%(id)s.%(ext)s"),
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
        "progress_hooks": [hook],
    }
    if COOKIES_FILE:
        opts["cookiefile"] = COOKIES_FILE
    if COOKIES_BROWSER:
        opts["cookiesfrombrowser"] = (COOKIES_BROWSER,)

    job.set(stage="오디오 다운로드 중", progress=0.02)
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(f"https://www.youtube.com/watch?v={vid}", download=True)
        reqs = info.get("requested_downloads") or []
        path = Path(reqs[0]["filepath"]) if reqs and reqs[0].get("filepath") else Path(ydl.prepare_filename(info))
    return path, info


def whisper_transcribe(vid: str, lang: str, model_size: str, job: Job) -> dict:
    with tempfile.TemporaryDirectory(prefix="ytt-") as td:
        audio, info = download_audio(vid, Path(td), job)
        job.say(f"오디오: {audio.name} ({audio.stat().st_size / 1e6:.1f} MB)")
        model = get_model(model_size, job)
        job.set(stage="받아쓰는 중", progress=0.15)
        segments, tinfo = model.transcribe(
            str(audio),
            language=None if lang == "auto" else lang,
            initial_prompt=WHISPER_PROMPT.get(lang),
            beam_size=5,
            vad_filter=True,
            condition_on_previous_text=False,  # 긴 영상에서 반복 루프 방지
        )
        detected = tinfo.language
        if lang == "auto":
            job.say(f"감지된 언어: {detected} ({tinfo.language_probability:.0%})")
        dur = tinfo.duration or float(info.get("duration") or 0) or 1.0
        out = []
        for s in segments:  # generator — 여기서 실제 디코딩
            if job.cancelled:
                raise Cancelled()
            t = s.text.strip()
            if t:
                out.append({"start": round(s.start, 2), "end": round(s.end, 2), "text": t})
            job.set(progress=0.15 + 0.85 * min(s.end / dur, 1.0), stage=f"받아쓰는 중 {fmt_clock(s.end)} / {fmt_clock(dur)}")
    return {"segments": out, "language": detected if lang == "auto" else lang,
            "source": f"whisper:{model_size}", "title": info.get("title"), "duration": info.get("duration")}


# ---------------------------------------------------------------- pipeline

def run_job(job: Job):
    o = job.opts
    if job.cancelled:  # 대기열에 있는 동안 취소됨
        return
    job.set(status="running")
    try:
        vid = parse_video_id(job.url)
        lang, mode = o["lang"], o["mode"]
        res = None
        if mode in ("auto", "captions"):
            try:
                res = fetch_captions(vid, lang, o["translate"], job)
            except Exception as e:
                if mode == "captions" or type(e).__name__ == "VideoUnavailable":
                    raise
                job.say(f"자막 실패 ({str(e).splitlines()[0][:160] or type(e).__name__}) → Whisper로 전환")
            if res is None and mode == "captions":
                raise RuntimeError("해당 언어 자막이 없습니다 (모드를 '자막 → Whisper'로 바꾸면 받아쓰기)")
        if res is None:
            res = whisper_transcribe(vid, lang, o["model"], job)
        res["video_id"] = vid
        res["title"] = res.get("title") or fetch_title(vid) or vid
        res["rtl"] = LANGS.get(res.get("language") or "", {}).get("rtl", res.get("language") in ("ar", "fa", "ur", "he", "ps"))
        job.say(f"완료 · {len(res['segments'])}개 구간 · {res['source']}")
        job.set(result=res, status="done", stage="완료", progress=1.0)
        try:
            job.save()
        except OSError as e:
            job.say(f"결과 저장 실패 (메모리엔 있음): {e}")
    except Cancelled:
        job.set(status="cancelled", stage="취소됨")
        job.say("사용자가 취소함")
    except Exception as e:
        if job.cancelled:  # yt-dlp가 Cancelled를 DownloadError로 감싸서 올림
            job.set(status="cancelled", stage="취소됨")
            job.say("사용자가 취소함")
            return
        msg = str(e).strip().splitlines()[0] if str(e).strip() else type(e).__name__
        job.set(status="error", error=msg, stage="오류")
        job.say("".join(traceback.format_exception_only(type(e), e)).strip())


# ---------------------------------------------------------------- formats

def fmt_clock(t: float) -> str:
    t = int(t)
    h, m, s = t // 3600, t % 3600 // 60, t % 60
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


def _ts(t: float, sep: str) -> str:
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}{sep}{ms:03d}"


def render(res: dict, fmt: str) -> str:
    segs = res["segments"]
    if fmt == "txt":
        return "\n".join(s["text"] for s in segs) + "\n"
    if fmt == "tstxt":
        return "\n".join(f"[{fmt_clock(s['start'])}] {s['text']}" for s in segs) + "\n"
    if fmt == "srt":
        return "\n".join(f"{i}\n{_ts(s['start'], ',')} --> {_ts(max(s['end'], s['start'] + 0.5), ',')}\n{s['text']}\n"
                         for i, s in enumerate(segs, 1))
    if fmt == "vtt":
        return "WEBVTT\n\n" + "\n".join(f"{_ts(s['start'], '.')} --> {_ts(max(s['end'], s['start'] + 0.5), '.')}\n{s['text']}\n"
                                        for s in segs)
    if fmt == "json":
        return json.dumps(res, ensure_ascii=False, indent=2)
    raise ValueError(fmt)


FORMATS = {"txt": "txt", "tstxt": "txt", "srt": "srt", "vtt": "vtt", "json": "json"}


# ---------------------------------------------------------------- web

def _icon_png(size: int = 180) -> bytes:
    """홈 화면 아이콘 — 빨간 바탕 + 흰 재생 삼각형 (외부 파일 없이 생성)."""
    import struct
    import zlib

    x0, x1, h, cy = 0.38 * size, 0.70 * size, 0.20 * size, size / 2
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            inside = x0 <= x <= x1 and abs(y + 0.5 - cy) <= h * (x1 - x) / (x1 - x0)
            raw += b"\xff\xff\xff" if inside else b"\xc4\x30\x2b"

    def chunk(t: bytes, d: bytes) -> bytes:
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)

    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b""))


def lan_addresses() -> list[str]:
    import socket
    ips = set()
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("10.255.255.255", 1))  # 패킷 안 나감, 기본 인터페이스 IP만 얻음
            ips.add(s.getsockname()[0])
    except OSError:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ips.add(info[4][0])
    except OSError:
        pass
    return sorted(ip for ip in ips if not ip.startswith("127."))


def load_token() -> str:
    """LAN 노출용 접속 키. 재시작해도 폰 북마크가 살아있게 파일에 고정."""
    if os.environ.get("YTT_TOKEN"):
        return os.environ["YTT_TOKEN"]
    import secrets
    f = DATA_DIR / "token"
    if f.exists():
        return f.read_text().strip()
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    tok = secrets.token_urlsafe(9)
    f.write_text(tok)
    return tok


LOOPBACK = {"127.0.0.1", "::1", "localhost"}


def build_app(token: str | None = None):
    import hmac
    from fastapi import FastAPI, HTTPException, Request
    from fastapi.responses import FileResponse, PlainTextResponse, Response
    from pydantic import BaseModel

    app = FastAPI(title="YT Transcript")
    load_saved_jobs()

    def authed(req: Request) -> bool:
        if not token or (req.client and req.client.host in LOOPBACK):  # PC 본인 / tailscale serve 경유
            return True
        given = req.query_params.get("key") or req.cookies.get("ytt_key") or ""
        return hmac.compare_digest(given, token)

    @app.middleware("http")
    async def gate(req: Request, call_next):
        if req.url.path == "/icon.png" or authed(req):
            resp = await call_next(req)
            if token and req.query_params.get("key") == token:
                resp.set_cookie("ytt_key", token, max_age=400 * 86400, httponly=True, samesite="lax")
            return resp
        return PlainTextResponse("접속 키가 필요합니다 — PC 터미널에 찍힌 '폰에서' 주소(…?key=…)로 여세요.", status_code=401)

    class JobIn(BaseModel):
        url: str
        lang: str = "auto"
        mode: str = "auto"  # auto | captions | whisper
        translate: bool = False
        model: str = DEFAULT_MODEL

    @app.get("/")
    def index():
        return FileResponse(HERE / "index.html")

    icon = _icon_png()

    @app.get("/icon.png")
    def icon_png():
        return Response(icon, media_type="image/png", headers={"Cache-Control": "max-age=86400"})

    @app.get("/manifest.webmanifest")
    def manifest():
        # iOS 홈 화면 앱은 Safari와 쿠키 저장소가 따로라 키를 시작 URL에 박아둠
        start = f"/?key={token}" if token else "/"
        return Response(json.dumps({
            "name": "YT Transcript", "short_name": "Transcript", "start_url": start, "display": "standalone",
            "background_color": "#f6f6f4", "theme_color": "#c4302b",
            "icons": [{"src": "/icon.png", "sizes": "180x180", "type": "image/png"}],
        }), media_type="application/manifest+json")

    @app.get("/api/config")
    def config():
        return {"langs": LANGS, "models": MODELS, "default_model": DEFAULT_MODEL,
                "cookies": bool(COOKIES_FILE or COOKIES_BROWSER)}

    @app.post("/api/jobs")
    def create(j: JobIn):
        try:
            parse_video_id(j.url)
        except ValueError as e:
            raise HTTPException(400, str(e))
        if j.lang != "auto" and j.lang not in LANGS:
            raise HTTPException(400, f"지원하지 않는 언어: {j.lang}")
        if j.mode not in ("auto", "captions", "whisper"):
            raise HTTPException(400, "mode")
        if j.model not in MODELS:
            raise HTTPException(400, "model")
        job = Job(j.url.strip(), j.model_dump())
        hit = find_cached(job)
        if hit:
            return {"id": hit.id, "cached": True}
        for other in JOBS.values():  # 같은 요청이 이미 대기/진행 중이면 그걸 돌려줌 (붙여넣기+Enter 중복 등)
            if other.status in ("queued", "running") and other.cache_key() == job.cache_key():
                return {"id": other.id, "cached": False}
        JOBS[job.id] = job
        EXEC.submit(run_job, job)
        return {"id": job.id}

    @app.get("/api/jobs")
    def list_jobs():
        return [j.public(full=False) for j in sorted(JOBS.values(), key=lambda j: -j.created)[:50]]

    @app.get("/api/jobs/{jid}")
    def get_job(jid: str):
        if jid not in JOBS:
            raise HTTPException(404)
        return JOBS[jid].public()

    @app.post("/api/jobs/{jid}/cancel")
    def cancel(jid: str):
        job = JOBS.get(jid)
        if not job:
            raise HTTPException(404)
        if job.status in ("queued", "running"):
            job.cancelled = True
            if job.status == "queued":
                job.set(status="cancelled", stage="취소됨")
            else:
                job.set(stage="취소하는 중…")
        return {"status": job.status}

    @app.delete("/api/jobs/{jid}")
    def delete(jid: str):
        job = JOBS.get(jid)
        if not job or job.status in ("queued", "running"):
            raise HTTPException(409 if job else 404)
        del JOBS[jid]
        (DATA_DIR / f"{jid}.json").unlink(missing_ok=True)
        return {"ok": True}

    @app.get("/api/jobs/{jid}/download")
    def download(jid: str, fmt: str = "txt"):
        job = JOBS.get(jid)
        if not job or not job.result:
            raise HTTPException(404)
        if fmt not in FORMATS:
            raise HTTPException(400, "fmt")
        res = job.result
        name = re.sub(r'[\\/:*?"<>|\n\r]+', "_", res.get("title") or res["video_id"])[:120]
        fname = f"{name}.{res.get('language') or 'xx'}.{FORMATS[fmt]}"
        from urllib.parse import quote
        return Response(render(res, fmt), media_type="text/plain; charset=utf-8",
                        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(fname)}"})

    return app


# ---------------------------------------------------------------- cli

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("url", nargs="?", help="유튜브 링크 (없으면 웹 UI 실행)")
    ap.add_argument("-l", "--lang", default="auto", choices=["auto", *LANGS])
    ap.add_argument("-m", "--mode", default="auto", choices=["auto", "captions", "whisper"])
    ap.add_argument("-t", "--translate", action="store_true", help="해당 언어 자막 없으면 유튜브 자동번역")
    ap.add_argument("--model", default=DEFAULT_MODEL, choices=MODELS)
    ap.add_argument("-f", "--format", default="tstxt", choices=list(FORMATS))
    ap.add_argument("-o", "--out", help="파일로 저장")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--no-browser", action="store_true")
    a = ap.parse_args()

    if a.url:
        job = Job(a.url, {"lang": a.lang, "mode": a.mode, "translate": a.translate, "model": a.model})
        t = threading.Thread(target=run_job, args=(job,), daemon=True)
        t.start()
        last = None
        while t.is_alive():
            line = f"{job.stage} {job.progress:.0%}"
            if line != last and sys.stderr.isatty():
                print(f"\r\x1b[K{line}", end="", file=sys.stderr, flush=True)
                last = line
            t.join(0.3)
        if sys.stderr.isatty():
            print("\r\x1b[K", end="", file=sys.stderr)
        for l in job.log:
            print(l, file=sys.stderr)
        if job.status != "done":
            sys.exit(f"오류: {job.error}")
        text = render(job.result, a.format)
        if a.out:
            Path(a.out).write_text(text, encoding="utf-8")
            print(f"→ {a.out}", file=sys.stderr)
        else:
            sys.stdout.reconfigure(encoding="utf-8")
            sys.stdout.write(text)
        return

    import uvicorn
    lan = a.host not in LOOPBACK
    token = load_token() if lan else None
    url = f"http://{'127.0.0.1' if lan else a.host}:{a.port}"
    if not a.no_browser:
        import webbrowser
        threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    print(f"→ {url}")
    if lan:
        for ip in ([a.host] if a.host not in ("0.0.0.0", "::") else lan_addresses()):
            print(f"→ 폰에서 (같은 와이파이): http://{ip}:{a.port}/?key={token}")
        print("  (키 바꾸려면 data/token 삭제 후 재시작)")
    uvicorn.run(build_app(token), host=a.host, port=a.port, log_level="warning")


if __name__ == "__main__":
    main()
