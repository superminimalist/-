# Virtual Imambargah

Next.js 15 · Supabase · LiveKit · next-intl (ko / en / ur / ar / fa, RTL)

## 실행

```bash
pnpm install
cp .env.example .env.local          # 값 채우기

# DB — Supabase CLI
supabase link --project-ref <ref>
supabase db push                    # supabase/migrations/*
psql "$DB_URL" -f supabase/seed.sql # 샘플 데이터 (선택)

pnpm dev
```

## 처음 설정

1. Supabase → Authentication → URL Configuration
   - Site URL: `http://localhost:3000` (배포 후 실제 도메인)
   - Redirect URLs: `http://localhost:3000/auth/callback`, `https://<도메인>/auth/callback`
2. `/ko/login`에서 메일 로그인 → SQL Editor에서 본인 계정을 관리자로:
   ```sql
   update profiles set role = 'admin'
   where id = (select id from auth.users where email = 'me@example.com');
   ```
3. LiveKit Cloud 프로젝트 생성 → URL/키를 `.env.local`에
4. (선택) 녹화: Supabase Storage → Settings → S3 Connection → access key 발급 → `RECORDING_S3_*`

## 흐름

- 관리 → 새 시리즈 → 새 마즐리스 (시작 시간은 브라우저 시간대 기준 입력, DB엔 UTC)
- 관리 → 송출 콘솔 → 카메라/마이크 허용 → **라이브 시작**
  → status `live`, 시청자 페이지 자동 새로고침, 채팅 열림, egress 녹화 시작
- **마즐리스 종료** → egress 중지, status `ended`, 페이지에 다시보기 표시

## 역할

| role   | 권한 |
|--------|------|
| member | 시청, 채팅 |
| host   | + 마즐리스/자료 관리, 송출, 채팅 삭제·뮤트 |
| admin  | + 역할 변경 |

## 구조

```
app/[locale]/            페이지 (home, schedule, majlis/[id], library, login, admin/*)
app/actions/             server actions (auth, admin)
app/api/livekit/token    LiveKit 토큰 발급 (host는 publish 권한)
app/auth/callback        매직링크 콜백
components/              LiveStage, Chat, LocalTime, ...
lib/                     supabase client/server, livekit, hijri, types
messages/                번역 5개
supabase/migrations/     스키마 + RLS + realtime + storage
```

## 3D 이맘바르가 (`/world`)

러크나우 바라 이맘바라 단지를 걸어다니는 공간. three.js + @react-three/fiber.

- 루미 다르와자 → 나우바트 대문 → 대마당(하우즈) → 아스피 모스크(계단으로 올라감) / 대홀
- 대홀 안으로 들어가면 라이브 마즐리스 패널이 뜸 → 그 자리에서 참여
- 멀티플레이: Supabase Realtime presence + broadcast (DB 저장 없음, 8Hz 위치 동기화)
- 조작: WASD / Shift / Space / 드래그 / 휠 / Enter 채팅, 모바일은 조이스틱
- `?spawn=court|mosque|hall` 로 바로 이동

```
components/world/
  layout.ts        좌표, 충돌 박스, 계단 높이, 카메라 충돌 — 건물 옮기면 여기도 같이
  architecture.tsx 아치/돔/미나렛/차트리/파라펫 프리미티브
  Buildings.tsx    건물 배치
  HallInterior.tsx 대홀 내부 (스투코 벽 캔버스 텍스처, 부채꼴 천장, 회랑, 자리흐, 촛대, 랜턴)
  Players.tsx      내 캐릭터(이동·점프·카메라) + 다른 사람 보간
  Avatar.tsx       쿠르타+토피 블록 캐릭터
  usePlaza.ts      realtime 채널
```

## 마파티훌 지난 (`/mafatih`)

셰이크 압바스 꿈미의 Mafatih al-Jinan(아랍어 원문 + 영어 안내, alhassanain.org PDF) 전체 650개 항목. 헤더 없는 앱형 화면, 라이트/다크 모드 지원.

- **오늘** — 지금 시간대에 맞는 기도, 요일별 두아·지야라트(토요일 = 예언자 … 금요일 = 이맘 마흐디), 목요일 밤 쿠마일 알림, 매일 드리는 기도, 자주 찾는 기도, 이어 읽기
- **리더** — 글자 크기/아랍어 글꼴(Amiri·Naskh·Scheherazade)/테마, 영어 안내 켜고 끄기, 화면 켜두기(Wake Lock), 한 구절씩 읽기(스와이프·탭·방향키), 진행률 저장
- **목차** — 섹션별 펼치기 + 검색(한글 큐레이션 이름 / 영문 제목)
- **타스비흐** — 파띠마 타스비흐 34·33·33 카운터(진동)
- **보관함** — 별표, 최근 읽은 기도 (localStorage)

```
content/mafatih/            추출된 본문 (index.json + s/<id>.json)
scripts/mafatih/extract.py  PDF → JSON (PyMuPDF; 합자 하라카트 순서·줄바꿈·꾸란 절번호 복원)
scripts/mafatih/messages.py 마파티흐 UI 문자열 5개 언어 → messages/*.json
lib/mafatih/plan.ts         요일/매일/자주 찾는 기도 ↔ 본문 위치 매핑
components/mafatih/         Shell(탭바), Today, Reader, Contents, Tasbih, Saved
```

본문 재생성: `pip install pymupdf && python3 -I scripts/mafatih/extract.py <pdf> content/mafatih`
