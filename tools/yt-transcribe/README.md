# yt-transcribe

유튜브 링크 붙여넣기 → 트랜스크립트. 개인용 로컬 툴.

지원 언어: 영어 · 아랍어 · 중국어 · 프랑스어 · 러시아어 · 스페인어 (UN 공용어) + 페르시아어 · 힌디어 · 우르두어, 그리고 자동 감지.

## 동작

1. **유튜브 자막** (`youtube-transcript-api`) — 수동 자막 > 자동 자막 > (옵션) 유튜브 자동번역
2. 자막이 없거나 막히면 **Whisper** (`yt-dlp`로 오디오 받고 `faster-whisper`로 받아쓰기)

우르두·페르시아어 영상은 유튜브 자막이 거의 없어서 대부분 2번으로 감. 품질은 `large-v3-turbo` 이상 권장.

## 설치

```bash
cd tools/yt-transcribe
python -m venv .venv
.venv/bin/pip install -r requirements.txt        # Windows: .venv\Scripts\pip
```

- `ffmpeg` 필요 없음 (PyAV가 디코딩)
- [deno](https://deno.com) 설치 권장 — 최신 yt-dlp가 유튜브 JS 챌린지 풀 때 씀
- NVIDIA GPU + CUDA 12/cuDNN 9 있으면 자동으로 GPU 사용, 없으면 CPU int8

## 실행

```bash
.venv/bin/python app.py                    # 웹 UI → http://127.0.0.1:8765 (브라우저 자동 열림)
.venv/bin/python app.py <url> -l fa        # CLI, 타임스탬프 텍스트로 stdout
.venv/bin/python app.py <url> -l ur -m whisper -f srt -o out.srt
```

웹 UI: 입력창에 링크 붙여넣으면 바로 시작. 언어/방식/모델 설정은 브라우저에 기억됨. TXT/SRT/VTT/JSON 다운로드, 복사, 검색, 타임스탬프 클릭 시 해당 시점으로 이동.

## 유튜브가 막을 때

`RequestBlocked` / `Sign in to confirm you're not a bot` 나오면 쿠키 사용:

- `YT_COOKIES_BROWSER=chrome` (또는 `firefox`, `edge`) — yt-dlp가 브라우저 쿠키 사용
- 또는 Netscape 형식 `cookies.txt`를 이 폴더에 두거나 `YT_COOKIES_FILE=경로` — 자막·오디오 둘 다 적용

## 환경변수

| 변수 | 기본값 |
|---|---|
| `WHISPER_MODEL` | `large-v3-turbo` |
| `YT_COOKIES_BROWSER` | — |
| `YT_COOKIES_FILE` | `./cookies.txt` 있으면 그것 |
