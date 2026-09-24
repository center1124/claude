# Diet Design

다이어트 디자인 코칭 앱. 종이 주간 기록지(수면·체중·허리·화장실·생리 + 하루 타임라인)를 그대로 옮긴 웹앱으로 시작해, 이후 모바일 앱으로 확장한다.

## 구조

```
apps/web        Next.js 웹앱 (PWA 예정)
packages/core   화면과 무관한 공용 로직 — 타입, 수면량·D-day·타임라인 계산, 저장소 인터페이스
                (나중에 React Native 앱에서도 그대로 재사용)
supabase/       DB 스키마와 접근 권한(RLS)
```

## 실행

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # 공용 로직 테스트
pnpm lint && pnpm typecheck
```

## 진행 상황

- [x] **1단계 — 기록하기**: 아침 체크(수면량 자동 계산, 생리 D-7~D+7 자동 표시), 식사 기록(시각·음식과 양·포만감·사진), 하루 타임라인, 주간 보기(종이 기록지 형태), 코치에게 보내기
  - 지금은 체험판: 기록은 브라우저(IndexedDB)에만 저장된다
- [ ] Supabase 연결: 로그인(카카오), 서버 저장, 사진 업로드 — 스키마는 `supabase/migrations/0001_init.sql`
- [ ] 2단계 — 코치 대시보드: 고객 목록, 제출 확인, 코멘트
- [ ] 3단계 — AI 피드백: AI 초안 → 코치 검토 → 전송
- [ ] 4단계 — 그래프, 알림, 홈 화면 설치(PWA)
