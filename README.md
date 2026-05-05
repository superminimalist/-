# Auspicious Days Calendar

React + Vite + Tailwind CSS 기반의 모바일 우선 PWA 샘플 앱입니다.

## 실행 방법

```bash
npm install
npm run dev
```

## 구조

- `src/pages`: 페이지 컴포넌트
- `src/components`: 공통 UI 컴포넌트
- `src/data`: 샘플 JSON 데이터
- `src/utils`: 날짜/점수 계산 유틸

## 데이터 수정

아래 파일을 수정하면 결과가 바뀝니다.

- `src/data/hijriDays.json`
- `src/data/weekdays.json`
- `src/data/qamarDarAqrab.json`
- `src/data/specialRules.json`

현재는 **샘플 데이터만** 포함되어 있고, PDF 데이터 추출/적용은 하지 않았습니다.
