# STEP3 실행 계획 (Supabase Email Auth + DB/RLS + Vercel)

## 1) 현재 구조 스캔 요약
- 라우팅: Expo Router 기반이며 IA는 이미 고정됨
  - Tabs: `/plan`, `/review`, `/goals`, `/inbox`
  - Modals: `/goal-picker`, `/carry-inbox`, `/assign-goal`, `/trash`
- 상태관리: `zustand persist` + `src/state/storage.ts`(web: localforage, native: AsyncStorage)
- 비즈니스 로직: `src/services/*`에서 store 메서드 호출
- 현재 인증/원격DB/Supabase/Vercel rewrite 설정 없음

## 2) STEP3에서 생성/수정할 파일

### 문서
- 생성: `docs/SUPABASE_SCHEMA.sql`
- 생성: `docs/SUPABASE_SETUP.md`
- 생성: `docs/VERCEL_DEPLOY.md`
- 생성: `docs/QA_STEP3.md`

### 인증/클라이언트
- 생성: `src/lib/supabaseClient.ts`
- 생성: `src/lib/authStorage.ts`
- 생성: `src/auth/AuthProvider.tsx`
- 생성: `src/auth/useAuth.ts`
- 생성: `app/(auth)/sign-in.tsx`
- 수정: `app/_layout.tsx` (AuthProvider + protected entry)
- 수정: `app/index.tsx` (auth 상태에 따른 진입)

### 보호 라우팅/로그아웃 UI
- 생성: `app/(auth)/_layout.tsx`
- 수정: `src/ui/layout/SidebarNav.tsx` (PC 사이드바 하단 Sign out)
- 필요 시 수정: `app/(tabs)/_layout.tsx` (tabs 접근 보호 보조)

### DB 스키마 대응 타입/동기화
- 생성: `src/sync/supabaseMappers.ts`
- 생성: `src/sync/syncService.ts`
- 생성: `src/sync/syncTypes.ts`
- 수정: `src/auth/AuthProvider.tsx` (로그인 시 `syncOnLogin` 호출)
- 수정: `src/state/store.ts` 또는 별도 초기화 지점 (변경 감지 debounce sync 연결)

### 배포
- 생성: `vercel.json` (SPA rewrite)
- 수정: `package.json` (web build/export 스크립트)

## 3) 구현 순서 (요구사항 고정 순서 준수)
1. 문서 3종 먼저 작성
2. Supabase client + auth state + sign-in 화면
3. protected routing + sign out
4. DB 연동 레이어(최소: sync/repo 유틸 + Supabase upsert/pull)
5. syncService 구현 + 로그인 시 sync
6. web export/vercel rewrite + 로컬 웹 빌드 검증
7. QA 문서 작성 (`docs/QA_STEP3.md`)

## 4) 동기화 정책 (Local-first + LWW)
- 원칙: 로컬 store가 항상 1차 동작
- 로그인 시:
  - 로컬 데이터가 있으면 `pushAll()` 우선
  - 로컬이 비어 있으면 `pullAll()`로 채움
- 이후 변경:
  - store subscribe + debounce로 `pushAll()` 수행
- 충돌 해결: `updated_at` 기반 Last-write-wins(개인용 단순 정책)
- 네트워크 실패: 에러 로그만 남기고 로컬 UX 유지

## 5) 커밋 계획 (5~7개)
1. `docs(step3): add supabase schema/setup and vercel deploy guide`
2. `feat(auth): add supabase client, auth provider, and sign-in route`
3. `feat(auth): add protected routing and sign-out actions`
4. `feat(sync): add supabase sync mappers and sync service`
5. `feat(sync): wire sync on login and debounced sync on store changes`
6. `chore(deploy): add web export scripts and vercel rewrite`
7. `docs(qa): add step3 qa checklist and run log`

## 6) 검증 계획
- 정적 검증: `npm run typecheck`
- 테스트: `npm run test:run`
- 웹 빌드: `npm run build:web`(추가 예정)
- 수동: 회원가입/로그인/로그아웃/새 기기 pull/오프라인 동작/딥링크 접속

## 7) 주의사항
- 기존 IA 라우트는 변경하지 않음 (추가 auth group만 도입)
- 클라이언트에는 anon key만 사용
- `service_role` 키 사용 금지
- 현재 더티 워크트리의 기존 UI 변경은 건드리지 않고 STEP3 파일 위주로 반영
