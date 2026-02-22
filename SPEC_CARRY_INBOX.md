좋아. 이제 **Codex로 바로 “만들기 시작”할 수 있는 부트스트랩 설계**를 확정해줄게. 목표는 **웹/모바일을 최대한 같은 코드로** 가고, MVP1을 빠르게 완성하는 구조야.

---

# 1) 기술 스택 결정 (MVP1 최적)

## Option A (추천: 가장 빠르고 안전)

* **Web + Mobile = Expo(React Native) + expo-router**

  * 모바일(iOS/Android) + 웹을 **한 코드베이스**로 커버
  * 라우팅/빌드/배포가 단순
* 상태관리: **Zustand**
* 저장소: **localForage(웹) + AsyncStorage(모바일)** 를 **하나의 storage 어댑터**로 감싸서 사용
* 드래그 정렬:

  * 모바일: `react-native-draggable-flatlist`
  * 웹: 간단히 Up/Down 버튼으로 MVP1 시작 → 나중에 DnD 추가(시간 절약)

> Option B(웹 Next.js + 모바일 Expo)도 가능하지만, MVP 속도는 Option A가 압도적으로 유리.

---

# 2) 라우팅/화면 구조 (expo-router 기준)

MVP 탭 3개(Plan/Goals/Review) 그대로 간다.

* `/ (tabs)`

  * `/(tabs)/plan` : 이번 주 Plan + 주차 탐색
  * `/(tabs)/goals` : Goals list/detail
  * `/(tabs)/review` : Review + Carry Inbox

추가:

* `/(modals)/carry-inbox?planId=...` (모달로 분리하면 UX가 깔끔)

---

# 3) 폴더 구조 (공용 코드 최대화)

```
app/
  (tabs)/
    plan.tsx
    goals.tsx
    review.tsx
  (modals)/
    carry-inbox.tsx
  _layout.tsx
  +not-found.tsx

src/
  core/
    time/
      week.ts               # KST 주차 계산
    ids/
      uuid.ts               # uuid wrapper
    types/
      domain.ts             # Goal/Plan/Task/Review/CarryAction 타입
  data/
    storage/
      index.ts              # storage interface
      web.ts                # localForage
      native.ts             # AsyncStorage
    repo/
      goalsRepo.ts
      plansRepo.ts
      tasksRepo.ts
      reviewsRepo.ts
      carryRepo.ts
  state/
    store.ts                # zustand root
    slices/
      goalsSlice.ts
      plansSlice.ts
      tasksSlice.ts
      reviewsSlice.ts
      carrySlice.ts
      uiSlice.ts
    selectors/
      planSelectors.ts
      goalSelectors.ts
      reviewSelectors.ts
  services/
    planService.ts          # ensureWeekPlan, getWeekPlan
    taskService.ts          # addTask, toggleDone, reorder
    reviewService.ts        # ensureReview, completionRate
    carryService.ts         # applyCarryActionsAndEnsureNextPlan (핵심)
  ui/
    components/
      Screen.tsx
      Header.tsx
      TextArea.tsx
      TaskItem.tsx
      TaskList.tsx
      GoalPicker.tsx
      Top3Bar.tsx
      StatRow.tsx
      EmptyState.tsx
    theme/
      tokens.ts
      styles.ts
```

---

# 4) “먼저 구현할 것” 우선순위 (막히지 않는 빌드 순서)

## Sprint 1: 데이터/상태/주차 계산

1. `week.ts` (KST 기준 periodStart/end 계산)
2. domain 타입(`domain.ts`)
3. storage 어댑터(웹/네이티브 분기)
4. zustand store + slices 기본 CRUD

✅ 이 단계가 되면 UI 없이도 “Plan 생성/Task 추가/Review 생성”이 돌아감

## Sprint 2: Plan 화면

* Plan ensure + note 저장 + task CRUD + top3 + goal 연결

## Sprint 3: Review + Carry Inbox

* completionRate 표시
* Carry Inbox 결정 draft 저장
* applyCarryActionsAndEnsureNextPlan 구현

## Sprint 4: Goals 화면

* Goal CRUD + Plan에서 Goal 연결 Picker

---

# 5) 스토어 설계 확정 (Zustand 형태)

## 5.1 store shape (권장)

* **normalized** 저장 (map by id)
* plan별 taskId 리스트는 selector에서 정렬(order)로 계산

예시 구조:

* `goals.byId`
* `plans.byId`
* `tasks.byId`
* `reviews.byId`
* `carry.byReviewId[fromTaskId] = draftDecision`
* `ui.currentWeekStart`, `ui.selectedPlanId`

## 5.2 “반드시 필요한 selector”

* `selectWeekPlan(periodStart)`
* `selectTasksForPlan(planId)` → `order` 정렬
* `selectIncompleteTasks(planId)`
* `selectCompletionRate(planId)`
* `selectReview(planId)`
* `selectCarryDraft(reviewId)` (inbox 렌더용)

---

# 6) 핵심 서비스 함수 스펙 (Codex 구현 가이드)

여기만 정확히 만들면 MVP의 80%가 끝나.

## 6.1 week.ts (KST 주차 계산)

* `getWeekPeriodKST(date?: Date): { startISO, endISO }`
* `addWeeks(periodStartISO, n): startISO`
* `formatWeekLabel(startISO): string`

> 주 시작은 “월요일 00:00 KST”, ISO 저장은 `Date.toISOString()`로 통일.

## 6.2 ensureWeekPlan(periodStartISO)

* plan이 있으면 반환
* 없으면 생성
* unique: `(type=week, periodStartISO)`

## 6.3 ensureReview(planId)

* 있으면 반환
* 없으면 생성(초기 completionRate는 selector로 계산해서 set)

## 6.4 applyCarryActionsAndEnsureNextPlan(planId) **(핵심)**

입력:

* current planId
* 그 plan의 reviewId
* carry draft decisions

처리:

1. nextWeekStart = addWeeks(current.periodStart, +1)
2. nextPlan = ensureWeekPlan(nextWeekStart)
3. incompleteTasks = currentPlan tasks 중 status=todo
4. 각 task에 대해 decision 결정(없으면 carry)
5. action별 처리:

   * carry: nextPlan에 task 복제 + carryFromTaskId
   * drop: 원 task status=dropped
   * rescope: 원 task dropped + nextPlan에 새 title task 생성
   * split: 원 task dropped + nextPlan에 자식들 생성(splitParentTaskId)
6. CarryAction 로그 생성(재적용 방지용)

   * “이미 해당 reviewId에 fromTaskId 기록이 있으면 skip”
7. 완료 후 nextPlanId 반환 (그리고 라우팅)

---

# 7) Carry Inbox UX 구현 디테일(개발 친화형)

## 7.1 Draft Decision 모델

* `decision = { action, note?, rescopeTitle?, splitTitles[] }`
* 저장 위치:

  * `carrySlice.drafts[reviewId][fromTaskId] = decision`

## 7.2 버튼 활성 조건

* incompleteTasks가 0개면 즉시 활성
* 있으면:

  * 모든 task에 decision이 있거나
  * “일괄 Carry”를 눌러 drafts가 채워졌으면 활성

## 7.3 재방문 처리

* review 화면 다시 열면 drafts 유지
* apply 후에는:

  * drafts를 지우거나(추천)
  * carryAction 로그가 있으니 UI에서 “이미 처리됨” 배지 표시

---

# 8) MVP에서 “드래그 정렬”을 안전하게 처리하는 방법

처음부터 웹/모바일 DnD를 완벽하게 맞추려다 시간이 늘어날 수 있어.

### MVP1 권장:

* 모바일만 드래그(DraggableFlatList)
* 웹은 `↑ ↓` 버튼으로 order swap
* 내부 로직은 동일: `reorderTask(planId, orderedTaskIds[])`만 호출

---

# 9) 초기 UI 컴포넌트 최소 세트

* `Screen` (safe area + padding)
* `Header` (title + action buttons)
* `TextArea` (Plan note, Review note)
* `TaskList` + `TaskItem` (checkbox, inline edit, goal picker, top3)
* `GoalPicker` (modal select)
* `EmptyState`
* `StatRow` (done/todo/completion)

---

# 10) “처음 커밋” 체크리스트

1. Expo 프로젝트 생성
2. expo-router 탭 3개 라우팅
3. zustand store + persistence 연결
4. week.ts 구현
5. ensureWeekPlan + Plan 화면에서 note/task CRUD
6. Review 화면 completion + Carry Inbox 모달
7. applyCarry 로직 완성 → next plan 이동

---

원하면 다음 답변에서는 **“코드 작성 순서대로” 파일 단위 체크리스트 + 각 파일에 들어갈 실제 구현 스켈레톤(타입/함수 시그니처/스토어 액션)**까지 한 번에 뽑아줄게.
(테스트 데이터를 자동 생성하는 `seedDemoData()`까지 넣으면 개발 속도가 훨씬 빨라져.)
