# STEP1 Plan (IA & Inbox Finalize)

## 목표
MVP2 구조를 최종 IA로 고정하고, Inbox를 시스템 goal 기반 정리 대기함으로 확정한다.

## 현재 스캔 요약
- 라우트가 단일 파일(`plan.tsx`, `review.tsx`, `goals.tsx`) 구조이며 `index/[id]` 분리가 안 되어 있음.
- 탭은 3개(Plan/Goals/Review)만 존재, Inbox 탭 부재.
- 모달은 `carry-inbox`, `trash`만 존재하며 `goal-picker`, `assign-goal` 부재.
- `ensureInboxGoal`는 title 기반 임시 생성이고 `systemType` 필드가 없음.
- Plan/Review/Goals 허브에서 inbox goal을 제외하는 필터가 아직 없음.

## 변경 파일 목록

### 문서
- `docs/IA_FINAL.md` (신규)
- `docs/INBOX_SPEC.md` (신규)
- `docs/QA_MVP2.md` (수정)
- `docs/STEP1_PLAN.md` (본 문서)

### 라우트 / 화면
- `app/_layout.tsx`
- `app/index.tsx`
- `app/(tabs)/_layout.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/plan/index.tsx` (신규)
- `app/(tabs)/plan/[planId].tsx` (신규)
- `app/(tabs)/review/index.tsx` (신규)
- `app/(tabs)/review/[planId].tsx` (신규)
- `app/(tabs)/goals/index.tsx` (신규)
- `app/(tabs)/goals/[goalId].tsx` (신규)
- `app/(tabs)/inbox/index.tsx` (신규)
- `app/(modals)/_layout.tsx`
- `app/(modals)/goal-picker.tsx` (신규)
- `app/(modals)/carry-inbox.tsx` (수정: `planId` query 기반)
- `app/(modals)/assign-goal.tsx` (신규)
- `app/(modals)/trash.tsx` (수정)
- 삭제/정리: `app/(tabs)/plan.tsx`, `app/(tabs)/review.tsx`, `app/(tabs)/goals.tsx`

### 상태/서비스/선택자
- `src/core/types/domain.ts`
- `src/state/types.ts`
- `src/state/slices/goalsSlice.ts`
- `src/state/slices/tasksSlice.ts`
- `src/state/selectors/planSelectors.ts`
- `src/state/selectors/reviewSelectors.ts`
- `src/services/taskService.ts`
- `src/services/migrationService.ts`

### 테스트
- `src/services/deleteService.test.ts` (필요 시 보강)
- `src/services/carryService.test.ts` (필요 시 필터 영향 확인)

## 구현 순서
1. 문서 선반영: IA/Inbox 스펙 문서 추가
2. 도메인/스토어 보강: `Goal.systemType`, 고정 Inbox goal, task reassign 액션
3. 선택자/필터: 허브 기본 리스트에서 inbox goal 제외
4. 라우트 리팩터: 탭/상세 경로를 `index/[id]` 구조로 분해
5. Inbox + assign-goal + goal-picker 모달 구현
6. Carry/Trash 라우트 파라미터 정리 및 QA 문서 업데이트

## 커밋 계획 (2~4개)
1. `docs(step1): add IA final map and inbox specification`
2. `refactor(routes): adopt final tab/detail route map and modal structure`
3. `feat(inbox): add system inbox goal, inbox tab, assign-goal flow`
4. `docs(qa): extend MVP2 QA with inbox scenarios and finalize step1`

## 검증
- `npm run typecheck`
- `npm test`
- 필요 시 `npm run web -- --port 8082` 라우트 수동 점검
