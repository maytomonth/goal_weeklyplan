# QA STEP3 (Supabase Auth + DB Sync + Vercel)

## 1) 범위
- 이메일 회원가입/로그인/로그아웃
- 보호 라우팅(미로그인 접근 차단)
- 로그인 시 로컬-원격 동기화
- 변경 시 원격 upsert 반영 (debounce)
- 오프라인/네트워크 오류 시 로컬 동작 유지
- 웹 export 및 SPA 딥링크 rewrite

## 2) 자동 검증 실행 기록
실행일: 2026-02-22

- `npm run typecheck` ✅ 통과
- `npm run test:run` ✅ 통과 (24 tests)
- `npm run build:web` ✅ 통과 (`dist` 생성)

## 3) 수동 QA 체크리스트

### A. 인증
1. `/sign-in` 진입 시 로그인/회원가입 탭 전환이 정상 동작한다.
Expected: 입력값 유지 + 전환 UI 정상

2. 회원가입(Email/Password) 후 로그인 상태가 된다.
Expected: `/plan`으로 이동

3. 로그아웃 버튼(PC Sidebar 하단) 동작
Expected: 세션 종료 + `/sign-in` 이동

4. 미로그인 상태에서 `/plan`, `/review`, `/goals`, `/inbox` 직접 접근
Expected: `/sign-in`으로 강제 리다이렉트

5. 모바일 폭(<1024)에서 Goals/Inbox 화면의 로그아웃 버튼 동작
Expected: 세션 종료 + `/sign-in` 이동

### B. 동기화
6. 로그인 직후 로컬 데이터가 있을 때 원격으로 업서트된다.
Expected: Supabase 테이블에 동일 데이터 반영

7. 새 기기/로컬 비어있는 상태에서 로그인
Expected: 원격 데이터를 pull해 로컬에 복원

8. 로그인 후 데이터 변경(목표/플랜/할 일/리뷰/carry) 발생
Expected: debounce 후 원격 upsert 반영

9. 소프트 삭제된 할 일(`deleted_at` 존재)
Expected: 원격 `tasks.deleted_at`에 반영

10. 하드 삭제(엔티티 제거)
Expected: 원격에서도 누락 엔티티가 삭제(reconcile)

### C. 멀티 계정 안전성
11. A 계정 로그인 후 데이터 생성 -> 로그아웃 -> B 계정 로그인
Expected: A 로컬 데이터가 B 계정으로 푸시되지 않음(로컬 owner guard 동작)

### D. 배포/라우팅
12. Vercel 운영 URL 루트 진입
Expected: 앱 로딩 정상

13. 딥링크 진입(`/plan/:planId`, `/goals/:goalId`, `/goal-picker` 등)
Expected: 404 없이 앱 라우팅

14. 딥링크 상태에서 브라우저 새로고침
Expected: rewrite로 index.html fallback 후 정상 렌더

### E. 오프라인 허용
15. 네트워크 끊긴 상태에서 로컬 CRUD
Expected: 로컬 UX 정상, sync 실패는 콘솔 경고만 발생

16. 네트워크 복구 후 데이터 변경
Expected: 다음 debounce 주기에 원격 반영 재개

## 4) 이슈 메모
- 로컬에 시스템 Inbox Goal만 존재하는 초기 상태는 "실질 데이터 없음"으로 취급하여 pull 우선 동작하도록 보정함.
