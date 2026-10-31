# Virtual Imambargah

온라인 이맘바르가. 시아파 신자들이 어디서든 마즐리스(majlis)에 참여하고, 노하·마르시야를 듣고, 무하르람/아슈라 일정을 따라갈 수 있는 웹앱.

## 사용자
- **참여자**: 마즐리스 시청/청취, 채팅, 일정 확인, 자료실 이용
- **주최자(관리자)**: 마즐리스 일정 등록, 라이브 송출, 자료 업로드, 채팅 관리

## MVP 기능 (이 순서로 구현)
1. **마즐리스 일정** — 히즈리력/그레고리력 병기, 무하르람 1~10일 등 시리즈 묶음, 내 시간대로 자동 변환
2. **라이브 마즐리스** — 오디오/비디오 스트리밍, 시청자 수, 종료 후 다시보기로 자동 저장
3. **실시간 채팅** — 라이브 중 채팅, 관리자 삭제/뮤트, 금칙어 필터
4. **자료실** — 노하, 마르시야, 지야라트, 두아 (오디오 + 원문 + 번역), 낭송자·언어·행사별 필터
5. **다국어 + RTL** — ko, en, ur, ar, fa. 우르두/아랍어/페르시아어는 RTL 레이아웃

## 나중에 (MVP 아님)
- 니야즈/기부 (결제)
- 기도 시간 알림 (자파리 계산법)
- 성별 분리 섹션 옵션
- 모바일 앱 (PWA 먼저)

## 스택
- Next.js 15 (App Router) + TypeScript + Tailwind
- Supabase — 인증, Postgres, Storage (오디오/영상 파일), Realtime (채팅)
- LiveKit Cloud — 라이브 송출/시청 (WebRTC, 다시보기는 Egress로 Storage 저장)
- next-intl — i18n, `dir="rtl"` 처리
- 히즈리력: `@umalqura/core` 또는 `Intl.DateTimeFormat('en-u-ca-islamic-umalqura')`
- 배포: Vercel

## 폴더 구조
```
app/
  [locale]/
    page.tsx              # 홈: 오늘/다가오는 마즐리스
    majlis/[id]/page.tsx  # 라이브 or 다시보기 + 채팅
    schedule/page.tsx
    library/page.tsx
    admin/...             # 관리자 전용
components/
lib/
  supabase/               # client, server
  livekit/
  hijri.ts
messages/                 # ko.json, en.json, ur.json, ar.json, fa.json
supabase/migrations/
```

## DB 테이블 (초안)
- `profiles` (id, display_name, role: 'member' | 'host' | 'admin', locale)
- `majlis_series` (id, title, occasion, hijri_year)
- `majlis` (id, series_id, title, speaker, starts_at timestamptz, status: 'scheduled' | 'live' | 'ended', livekit_room, recording_url)
- `chat_messages` (id, majlis_id, user_id, body, created_at, deleted)
- `library_items` (id, type: 'nauha' | 'marsiya' | 'ziyarat' | 'dua', title, reciter, language, audio_url, text_original, text_translation)

모든 테이블에 RLS 켤 것. 쓰기는 role 기준.

## 규칙
- 서버 컴포넌트 기본, 클라이언트 컴포넌트는 필요할 때만 (`"use client"`)
- 시간은 DB에 UTC로 저장, 표시할 때만 사용자 시간대로 변환
- 하드코딩 문자열 금지 → `messages/*.json`
- RTL: `ml-*`/`mr-*` 대신 `ms-*`/`me-*` (logical properties)
- 종교 텍스트(아랍어 원문) 폰트: Amiri 또는 Noto Naskh Arabic, 우르두: Noto Nastaliq Urdu
- 기능 하나 끝날 때마다 실행 확인 후 커밋

## 명령어
```
pnpm dev
pnpm build
pnpm lint
supabase db push
```

## 환경변수
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
NEXT_PUBLIC_LIVEKIT_URL=
```
