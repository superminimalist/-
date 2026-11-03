#!/bin/bash
# macOS: 더블클릭 / Linux: ./run.command  — 처음엔 설치, 이후엔 바로 실행
cd "$(dirname "$0")" || exit 1

PY=""
for c in python3.13 python3.12 python3.11 python3.10 python3; do
  if command -v "$c" >/dev/null 2>&1 && "$c" -c 'import sys; sys.exit(sys.version_info < (3, 10))' 2>/dev/null; then
    PY=$(command -v "$c"); break
  fi
done
if [ -z "$PY" ]; then
  echo "Python 3.10 이상이 필요합니다."
  echo "  Mac: https://www.python.org/downloads/ 에서 설치 (또는 brew install python)"
  read -r -p "엔터를 누르면 닫힙니다"; exit 1
fi

if ! cmp -s requirements.txt .venv/req.txt; then
  echo "[설치] 처음 한 번만 — 몇 분 걸립니다"
  [ -x .venv/bin/python ] || "$PY" -m venv .venv || { read -r -p "venv 생성 실패. 엔터"; exit 1; }
  .venv/bin/python -m pip install -q --upgrade pip
  .venv/bin/python -m pip install -r requirements.txt || { read -r -p "설치 실패 — 위 오류 확인. 엔터"; exit 1; }
  cp requirements.txt .venv/req.txt
fi

command -v deno >/dev/null 2>&1 || echo "(권장) deno 미설치 — 유튜브 다운로드가 막히면: curl -fsSL https://deno.land/install.sh | sh"
echo "브라우저가 자동으로 열립니다. 끄려면 이 창을 닫거나 Ctrl+C"
exec .venv/bin/python app.py "$@"
