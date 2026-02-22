# DELETE IMPLEMENTATION PLAN (PRD_v2)

## 기준
- 단일 기준 문서: `docs/PRD_v2.md`
- 기존 MVP2 구조(periodStart × goalId, Carry Inbox, Review)는 유지
- 구현 순서: 타입/스토어/서비스 -> UI -> 문서/QA

## 현재 코드 스캔 요약
- Goal은 `archiveGoal`만 존재, `hardDeleteGoal` 없음
- Plan은 생성/조회/노트/Top3만 있고 삭제 없음
- Task는 엔티티 삭제/soft delete/undo 없음 (`deletedAt` 필드 없음)
- 셀렉터가 삭제 상태를 고려하지 않음
- CarryAction은 생성만 가능, cascade 정리 API 없음
- UI는 Goal/Plan/Task 삭제 액션 없음

## 변경 대상 파일

### A. 데이터/타입
- `src/core/types/domain.ts`
- `src/state/types.ts`

### B. 스토어/셀렉터
- `src/state/slices/tasksSlice.ts`
- `src/state/slices/plansSlice.ts`
- `src/state/slices/goalsSlice.ts`
- `src/state/slices/reviewsSlice.ts`
- `src/state/slices/carryActionsSlice.ts`
- `src/state/slices/carryDraftSlice.ts` (plan 삭제 시 draft 정리)
- `src/state/selectors/planSelectors.ts`
- `src/state/selectors/reviewSelectors.ts`
- `src/services/test-utils/makeTestStore.ts`

### C. 서비스
- `src/services/taskService.ts` (신규)
- `src/services/planService.ts` (신규)
- `src/services/goalService.ts` (신규)
- `src/services/carryService.ts` (삭제/soft-delete task 안전성)

### D. UI
- `app/(tabs)/plan.tsx`
- `app/(tabs)/goals.tsx`
- `app/(tabs)/review.tsx` (삭제된 task 반영 상태)
- `app/(modals)/carry-inbox.tsx` (삭제된 task 숨김)
- `src/components/toast/ToastProvider.tsx` (Undo 액션 지원)
- `app/(modals)/_layout.tsx` + `app/(modals)/trash.tsx` (선택: 휴지통)

### E. 문서/QA
- `docs/PRD_v2.md`
- `docs/QA_MVP2.md`

## 커밋 계획
1. `refactor(delete): add deletion-capable domain/store and selectors`
- Task `deletedAt` 필드/soft-delete 상태, active/deleted selectors, Top3 정합성, cascade store 액션 추가

2. `feat(delete): add goal/plan/task deletion services and tests`
- `taskService/planService/goalService` 구현, carry 연동 안전성 반영, 테스트 추가

3. `feat(delete-ui): wire archive/delete flows with undo and trash`
- Goal Detail archive/hard delete, Plan Detail delete, Task soft delete + Undo(10초), 휴지통 진입/복원/영구삭제

4. `docs(delete): update PRD v2 policy and QA scenarios`
- PRD 정책 섹션 추가, QA 시나리오 6개+ 추가

## 검증 명령
- 각 커밋 전후: `npm run typecheck && npm test`
- UI 단계: `npm run web -- --port 8082` 부팅 확인
