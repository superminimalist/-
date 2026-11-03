@echo off
rem Windows: 더블클릭 — 처음엔 설치, 이후엔 바로 실행
chcp 65001 >nul
cd /d "%~dp0"

set "PY="
py -3 -c "import sys; sys.exit(sys.version_info < (3, 10))" >nul 2>nul && set "PY=py -3"
if not defined PY python -c "import sys; sys.exit(sys.version_info < (3, 10))" >nul 2>nul && set "PY=python"
if not defined PY goto nopython

fc /b requirements.txt .venv\req.txt >nul 2>nul && goto run
echo [설치] 처음 한 번만 - 몇 분 걸립니다
if not exist .venv\Scripts\python.exe %PY% -m venv .venv || goto fail
.venv\Scripts\python -m pip install -q --upgrade pip
.venv\Scripts\python -m pip install -r requirements.txt || goto fail
copy /y requirements.txt .venv\req.txt >nul

:run
where deno >nul 2>nul || echo (권장) deno 미설치 - 유튜브 다운로드가 막히면 PowerShell에서: irm https://deno.land/install.ps1 ^| iex
echo 브라우저가 자동으로 열립니다. 끄려면 이 창을 닫으세요.
.venv\Scripts\python app.py %*
pause
exit /b

:nopython
echo Python 3.10 이상이 필요합니다.
echo https://www.python.org/downloads/ 에서 설치 - 설치 첫 화면에서 "Add python.exe to PATH" 꼭 체크
pause
exit /b 1

:fail
echo 설치 실패 - 위 오류 메시지를 확인하세요.
pause
exit /b 1
