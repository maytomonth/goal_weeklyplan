# MVP2 Refactor Plan (PRD_v2 기준)

## 기준
- 단일 기준 문서: `docs/PRD_v2.md`
- 목표: `WeeklyPlan`을 `periodStart × goalId` 단위로 전환
- 완료 조건: 각 단계 종료 시 `npm run typecheck && npm test && npm run web` 기동 가능 상태 유지

## 현재 구조 진단 요약
- `Plan`은 주차당 1개(`ensureWeekPlan(periodStart, periodEnd)`)
- `Task.goalId`는 optional이며 plan 단위와 느슨하게 연결
- `Carry`는 다음 주 `periodStart`만 기준으로 next plan을 찾음
- UI는 주차 중심 단일 plan 화면이며 목표 허브/목표별 plan 목록 구조가 없음

## 변경 대상 파일 목록

### 1) 모델/스토어
- `src/core/types/domain.ts`
- `src/state/types.ts`
- `src/state/slices/plansSlice.ts`
- `src/state/slices/tasksSlice.ts`
- `src/state/selectors/planSelectors.ts`
- `src/state/selectors/reviewSelectors.ts`
- `src/state/selectors/weekSelectors.ts`
- `src/state/store.ts`
- `src/services/test-utils/makeTestStore.ts`

### 2) Carry 로직
- `src/services/carryService.ts`
- `src/services/carryService.test.ts`

### 3) UI/마이그레이션
- `app/(tabs)/plan.tsx`
- `app/(tabs)/review.tsx`
- `app/(modals)/carry-inbox.tsx`
- `app/(tabs)/goals.tsx`
- `src/components/*` (필요 시 분리 컴포넌트 추가)
- `src/state/slices/uiSlice.ts`
- `src/services/migrationService.ts` (신규)
- `app/_layout.tsx` (마이그레이션 부팅 훅 필요 시)

## 작업 순서

### Step 0: 설계 고정 (완료)
- `docs/MVP2_REFACTOR_PLAN.md` 작성

### Step 1: 모델/스토어 리팩터 (Commit 1)
- `Plan` 타입에 `goalId: ID` 필수 추가
- `Task.goalId`를 필수로 전환
- plan store API 변경:
  - `ensureGoalWeeklyPlan(periodStartIso, periodEndIso, goalId, sourcePlanId?)`
  - `getWeekPlan(periodStartIso, goalId)`
  - 유니크 키: `(periodStart, goalId)`
  - 하위 호환용 `ensureWeekPlan(...)` 래퍼 유지 (내부에서 `ensureGoalWeeklyPlan` 호출)
- 선택자 추가/변경:
  - `selectPlanByPeriodAndGoal`
  - `selectPlansByPeriod`
  - `selectWeeklyPlansForWeek(periodStartIso)`
  - `selectTasksByPlan`는 유지하되 goal 일관성 가드 반영
- UI 상태에서 목표 단위 선택 보조 필드 추가:
  - `selectedGoalIdForWeekPlan` (필요 시)
- 테스트 픽스처(`makeTestStore`)를 새 시그니처에 맞춤

검증:
- `npm run typecheck`
- `npm test`
- `npm run web` (boot 확인)

### Step 2: Carry 로직 목표 단위 전환 (Commit 2)
- `applyCarryActionsAndEnsureNextPlan(planId)` 내부에서:
  - source plan의 `goalId` 확인
  - next plan 생성/조회 시 `sameGoalId` 강제
- 중복 방지/재적용 방지 규칙 유지:
  - `unique(reviewId, fromTaskId)` 논리 유지
- carry/split/rescope 생성 task의 `goalId`를 next plan goalId로 고정
- 테스트 시나리오 보강:
  - 다른 goal로 carry되지 않음
  - next plan existing + same goal merge

검증:
- `npm run typecheck`
- `npm test`

### Step 3: UI/마이그레이션 (Commit 3)
- Plan 탭: 이번 주 목표 플랜 허브로 전환
  - 주차별 plan 카드 리스트(목표명/완료율/todo)
  - `+ 목표 플랜 추가` (active goal 선택)
  - 선택한 카드에서 plan detail(노트/태스크/top3) 편집
- Review 탭: 목표별 리뷰 허브 + detail 전환
- Carry Inbox: 선택된 목표 plan 기준으로 동작
- Goals 탭:
  - goal detail에 최근 n주 plan 히스토리(week label/completion)
  - 특정 주 plan으로 이동
- 마이그레이션(`migrationService`):
  - v1 plan/tasks를 goal 기준 그룹화해 v2 weekly plan 생성
  - goalId 없는 task는 Inbox goal 자동 생성 후 이관
  - 레거시 review는 보존(분해 제외)

검증:
- `npm run typecheck`
- `npm test`
- `npm run web` 실행 및 수동 확인

## 커밋 계획
1. `refactor(mvp2): update domain model and store for periodStart-goalId weekly plans`
2. `refactor(mvp2): apply carry actions within same-goal next week plans`
3. `feat(mvp2): add goal-based weekly plan hub and legacy migration`
