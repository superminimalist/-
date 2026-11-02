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

## 아이폰에서 쓰기

받아쓰기는 PC(또는 Mac)에서 돌고, 아이폰은 브라우저로 붙는 구조. 아이폰 자체에선 Whisper가 안 돌고, 클라우드 서버는 유튜브가 IP를 막아서 집 PC가 제일 현실적임. **PC는 켜져 있어야 함.**

### A. Tailscale (추천 — 밖에서도 됨, HTTPS)

1. PC와 아이폰에 [Tailscale](https://tailscale.com) 설치, 같은 계정으로 로그인
2. PC에서:
   ```bash
   .venv/bin/python app.py --no-browser      # 127.0.0.1에만 열림
   tailscale serve --bg 8765                 # → https://<PC이름>.<tailnet>.ts.net
   ```
   (처음이면 tailnet 관리 페이지에서 HTTPS 인증서 켜라고 안내 나옴)
3. 아이폰 Safari에서 `https://<PC이름>.<tailnet>.ts.net` 열기

HTTPS라서 **붙여넣기 버튼**(클립보드 바로 읽기)과 **공유 버튼**(iOS 공유 시트)이 다 동작함.

### B. 같은 와이파이만

```bash
.venv/bin/python app.py --host 0.0.0.0
```
터미널에 찍히는 `→ 폰에서: http://192.168.x.x:8765`를 아이폰 Safari로 열기. 방화벽이 물어보면 허용.
http라서 붙여넣기 버튼은 안 됨 → 입력창 길게 눌러 붙여넣기. 인증이 없으니 카페 같은 공용 와이파이에선 쓰지 말 것.

### 홈 화면에 추가

Safari → 공유 → **홈 화면에 추가**. 앱처럼 전체화면으로 열림.

### 유튜브 앱에서 바로 보내기 (단축어)

단축어 앱 → 새 단축어:

1. **공유 시트에서 입력 받기** — 유형: URL
2. **URL 인코딩** — 입력: 단축어 입력
3. **URL 열기** — `https://<PC이름>.<tailnet>.ts.net/?url=` 뒤에 *인코딩된 텍스트* 변수 붙이기
   (언어 고정하려면 끝에 `&lang=ur` 같은 식으로 추가)

설정에서 "공유 시트에서 보기" 켜기. 이제 유튜브 앱 → 공유 → 단축어 이름 누르면 바로 받아쓰기 시작.

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
