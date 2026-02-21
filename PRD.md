좋아. 지금부터 **Codex로 바로 옮길 수 있는 수준의 PRD(구현 스펙)**로 “조여서” 확정해줄게. (화면별 컴포넌트/상태/액션, 이월 로직, 엣지케이스, 주차 규칙, 스키마/스토어까지)

---

# PRD v1.0 (Implementation Spec) — 가칭 Goal Tracker (MVP1)

## 1) 고정 규칙

### 1.1 시간/주차 기준

* Timezone: **Asia/Seoul (KST)**
* Week start: **월요일 00:00**
* Week period:

  * `periodStart` = 해당 주 월요일 00:00:00
  * `periodEnd` = 다음 주 월요일 00:00:00 (exclusive)
* “이번 주” 계산은 항상 KST 기준

### 1.2 데이터 불변성 원칙

* Plan은 “그 주의 문서”로 **기간은 수정 불가**
* Task는 Plan에 속한다.
* Carry는 “이동”이 아니라 **복제 + 연결(carryFromTaskId)** 로 처리한다(히스토리 보존).

---

## 2) 엔티티/스키마 (MVP1 확정)

> 관계/로그를 단단히 잡아두면 나중에 통계/인사이트가 쉬워짐

### 2.1 Goal

* `id` (uuid)
* `title` (string, required)
* `description` (string, optional)
* `dueType` ("none" | "date")
* `dueDate` (date, optional)
* `status` ("active" | "archived")
* `createdAt`, `updatedAt`

### 2.2 Plan (Week)

* `id` (uuid)
* `type` = "week"
* `periodStart` (datetime, required)
* `periodEnd` (datetime, required)
* `note` (string, default "")
* `top3TaskIds` (string[], default [])
* `createdFromPlanId` (uuid?, optional) — 다음 주 생성 시 출처
* `createdAt`, `updatedAt`
* **unique constraint**: `(type, periodStart)` 한 주에 Plan 1개

### 2.3 Task

* `id` (uuid)
* `planId` (uuid, required)
* `goalId` (uuid?, optional)
* `title` (string, required)
* `status` ("todo" | "done" | "dropped")  ※ MVP1에서는 “in_progress” 없음
* `order` (number, required) — 정렬/드래그용
* `carryFromTaskId` (uuid?, optional) — 이월/리스코프/스플릿 계보
* `splitParentTaskId` (uuid?, optional) — split로 생성된 하위 task면 parent 연결
* `createdAt`, `updatedAt`
* (선택 확장용 자리만 확보) `completedAt?`, `note?`

### 2.4 Review (Week)

* `id` (uuid)
* `planId` (uuid, required, unique) — Plan당 Review 1개
* `summaryNote` (string, default "")
* `completionRate` (number, 0~1)
* `createdAt`, `updatedAt`

### 2.5 CarryAction (결정 로그)

* `id` (uuid)
* `reviewId` (uuid, required)
* `fromTaskId` (uuid, required)
* `action` ("carry" | "split" | "drop" | "rescope")
* `toTaskIds` (uuid[], default [])
* `note` (string?, optional) — drop 사유 등
* `createdAt`

---

## 3) 핵심 로직 (서버/클라 공용 규칙)

## 3.1 완료율 계산

* 대상: 해당 Plan의 Task 중 **status != dropped**
* `completionRate = doneCount / (todoCount + doneCount)`
* Task가 0개면 completionRate = 0 (표시는 “할 일 없음”)

## 3.2 Carry Inbox 생성 조건

* Review 화면 진입 시, 해당 Plan에서:

  * `status == todo` 인 task만 **Carry Inbox 후보**로 수집

## 3.3 CarryAction 적용 규칙 (가장 중요)

Carry Inbox는 “결정 → 적용(apply)”의 2단계로 처리한다.

### A) carry

* 다음 주 Plan에 새 Task 생성:

  * `title` 동일
  * `goalId` 동일
  * `status = todo`
  * `carryFromTaskId = fromTaskId`
* `toTaskIds = [newTaskId]`
* 원본 Task는 **그대로 todo 유지**(지난주에 미완료였다는 사실 보존)

### B) drop

* 원본 Task를 `status = dropped`로 변경
* 다음 주에는 생성하지 않음
* `toTaskIds = []`

### C) rescope

* 원본 Task는 `status = dropped`
* 다음 주 Plan에 새 Task 생성(더 작은 범위):

  * `title = rescopeTitle(필수 입력)`
  * `carryFromTaskId = fromTaskId`
* `toTaskIds = [newTaskId]`

### D) split

* 원본 Task는 `status = dropped` (또는 유지하고 싶으면 “split parent” 상태가 필요하지만 MVP1은 dropped로 단순화)
* 다음 주 Plan에 하위 Task들 생성:

  * 각 task: `title = 입력값`
  * `carryFromTaskId = fromTaskId`
  * `splitParentTaskId = fromTaskId` (계보 시각화에 좋음)
* `toTaskIds = [child1Id, child2Id, ...]`

### E) 기본값 / 일괄처리

* Carry Inbox에서 action 미선택이면:

  * UX에서 “일괄 Carry” 버튼 제공
  * 저장 시점에는 **미선택 = carry**로 자동 처리(데이터 누락 방지)

## 3.4 다음 주 Plan 자동 생성 (Draft)

* “다음 주 계획 만들기” 버튼 클릭 시:

  1. 다음 주 `periodStart/periodEnd` 계산
  2. 다음 주 Plan이 없으면 생성(있으면 열기)
  3. CarryAction을 적용해 생성된 `toTaskIds` task들을 그 Plan에 포함
  4. `createdFromPlanId = thisPlanId` 설정
* Draft에는 note/top3는 비워두되, 상단에 “Carry tasks imported” 배지 정도만 표시(선택)

---

## 4) 화면 IA 및 상세 스펙 (MVP1)

MVP1은 탭 3개로 간결하게 가자:

* **Plan(이번 주)**
* **Goals**
* **Review**

---

# 4.1 Plan Screen (이번 주 계획 문서)

## 목적

* “이번 주를 운영하는 문서”로서 노트+투두를 한 화면에서 끝낸다.

## 화면 구성

1. 헤더

* 제목: `YYYY.MM.DD ~ YYYY.MM.DD (이번 주)`
* 버튼:

  * `Review` (리뷰로 이동)
  * `주 변경`(이전/다음 주 탐색, 선택)

2. Note 영역 (Plan Note)

* 멀티라인 텍스트
* Placeholder: “이번 주 의도/전략/주의점…”
* 자동 저장(디바운스)

3. Top 3 영역

* Task 중 3개를 핀(Pin)
* UI:

  * “Top 3로 지정” 토글(각 task 옆)
  * 상단에 Top3 리스트로 별도 표시
* 규칙:

  * 최대 3개
  * Top3는 `top3TaskIds`로 저장

4. Task List 영역

* 섹션: “Tasks”
* 기능:

  * 추가(Add)
  * 체크(done/todo)
  * 드래그 정렬(order)
  * 삭제는 MVP1에선 “Drop”과 혼동되니 **삭제 금지**(대신 Drop은 리뷰/Carry에서만)
* Task item UI

  * 체크박스
  * 제목(인라인 편집)
  * Goal 연결(옵션)

    * “목표 연결” 드롭다운 (Goals에서 선택)
    * 없으면 “No Goal”

## 주요 액션/상태

* `createTask(title)`
* `toggleTaskDone(taskId)`
* `editTaskTitle(taskId, title)`
* `reorderTasks(fromIndex, toIndex)`
* `setTaskGoal(taskId, goalId|null)`
* `toggleTop3(taskId)` (add/remove)

## 엣지케이스

* Plan이 없으면: “이번 주 계획 만들기” CTA 표시
* Task 0개: “할 일을 추가해보자” empty state
* Top3 지정하려는데 이미 3개면: 가장 오래된 Top3를 자동 해제(또는 토스트) — 구현 단순하게 “토스트 + 선택 안됨” 추천

---

# 4.2 Goals Screen

## 목적

* 목표를 관리하고, 목표별로 “이번 주 기여”가 느껴지게 한다(가벼운 수준).

## 화면 구성

1. Goals List

* Goal 카드:

  * 제목
  * due 정보(있으면)
  * 상태(active/archived)
  * 이번 주 연결 Task 개수(간단 지표)
* 상단: `+ New Goal`

2. Goal Detail

* Goal 정보(제목/설명/기한)
* “Linked Tasks (최근 4주)” 리스트(선택)

  * task title, week label, status
* MVP1에서는 통계는 최소(리스트 중심)

## 주요 액션

* `createGoal`
* `editGoal`
* `archiveGoal`
* `linkTaskToGoal` (Plan에서 수행해도 됨)

## 엣지케이스

* Goal 삭제는 MVP1 제외(아카이브로 대체)

---

# 4.3 Review Screen + Carry Inbox (핵심)

## 목적

* 리뷰를 통해 다음 주가 자동으로 정돈되는 경험 제공.

## 화면 구성

1. 헤더

* 제목: “Weekly Review”
* 표시: 완료율(progress)
* 버튼:

  * `Carry Inbox 열기`(미완료가 있으면 강조)
  * `다음 주 계획 만들기`(조건부 활성)

2. Review Summary Note

* 텍스트 영역(자동 저장)
* Placeholder: “잘된 점 / 문제 / 다음 개선…”

3. Metrics (간단)

* 완료: doneCount
* 남음: todoCount
* droppedCount (작게)

4. Carry Inbox (모달/시트/내장 섹션)

* 미완료 Task 리스트
* 각 항목에 액션 선택 UI:

  * Carry / Split / Drop / Rescope
* 상단에 “일괄 Carry” 버튼
* Split UI:

  * 하위 task 입력 폼(최소 2줄)
  * `+ add subtask`
* Rescope UI:

  * “더 작은 버전 제목” 입력(필수)
* Drop UI:

  * drop note(optional)

5. Next Week CTA 활성 조건

* 규칙:

  * 미완료 task가 0개면 즉시 활성
  * 미완료 task가 있으면:

    * **모든 항목이 action 결정되었거나**
    * “일괄 Carry”가 적용된 상태여야 활성
* 클릭 시:

  * CarryAction apply + next Plan open

## 주요 액션/상태

* `openReview(planId)` (없으면 생성)
* `setReviewNote(text)`
* `setCarryDecision(taskId, action)`
* `setDropNote(taskId, note)`
* `setRescopeTitle(taskId, title)`
* `setSplitChildren(taskId, titles[])`
* `applyCarryAndCreateNextPlan()`

## 엣지케이스 (반드시 처리)

* **다음 주 Plan이 이미 존재**:

  * 생성 대신 “다음 주 Plan 열기”
  * Carry 적용 시 중복 생성 방지:

    * CarryAction이 이미 적용된 task는 재적용 금지(결정 로그 기준)
* **리뷰를 여러 번 열었다 닫음**:

  * 결정은 local draft로 유지하되,
  * “적용(apply)”는 버튼 클릭 시 1회만
* **Split인데 하위가 비어있음**:

  * 최소 1개 이상 입력 강제
* **Rescope 타이틀 비어있음**:

  * 저장 불가 처리
* **미완료 task가 너무 많음**:

  * 상단에 “일괄 Carry” 제공은 필수(피로도 방지)

---

## 5) 상태관리/스토어 설계 (Codex 구현 친화)

MVP는 단순하게 “로컬 우선” 구조 추천:

### 5.1 Store slices

* `goalsSlice`
* `plansSlice`
* `tasksSlice`
* `reviewsSlice`
* `carryActionsSlice`
* `uiSlice` (현재 주, 선택 planId, 모달 상태 등)

### 5.2 Derived selectors (필수)

* `selectCurrentWeekPeriod()`
* `selectPlanByPeriod(periodStart)`
* `selectTasksByPlan(planId)` (order 정렬)
* `selectIncompleteTasks(planId)` (status==todo)
* `selectCompletionRate(planId)`
* `selectCarryDraft(planId)` (UI 초안)

### 5.3 Persistence

* MVP1:

  * IndexedDB(localForage) 또는 localStorage
* 확장:

  * Supabase/Firebase로 sync 레이어 추가(동일 스키마 유지)

---

## 6) API/서비스 레이어 (로컬 구현 기준)

Codex 구현을 위해 “서비스 함수” 형태로 확정해두면 빠름.

### 6.1 Week helpers

* `getWeekPeriod(dateKST): {start, end}`
* `formatWeekLabel(start): "YYYY.MM.DD ~ YYYY.MM.DD"`

### 6.2 Plan

* `ensureWeekPlan(periodStart): plan`
* `getWeekPlan(periodStart): plan|null`

### 6.3 Task

* `addTask(planId, title, goalId?)`
* `toggleDone(taskId)`
* `updateTask(taskId, patch)`
* `reorderTask(planId, orderedTaskIds[])`

### 6.4 Review / Carry

* `ensureReview(planId): review`
* `saveCarryDecision(reviewId, fromTaskId, decisionDraft)`
* `applyCarryActionsAndEnsureNextPlan(planId): nextPlanId`

  * 내부에서:

    * 다음 주 plan ensure
    * carryActions create + tasks create/update(dropped)
    * completionRate update

---

## 7) UX 미세 규칙 (사용감 결정)

* Plan note는 “저장 버튼” 없이 자동 저장
* Task 체크는 즉시 반영
* Drop은 Plan 화면에서 못 하게 막는다(혼란 방지)
* “다음 주 계획 만들기”는 Review에서만 하게 한다(루프 고정)
* 주간 탐색은 가능하되, 기본은 “이번 주”로 진입

---

## 8) QA 시나리오 (MVP1 테스트 체크리스트)

1. 이번 주 Plan 생성 → task 3개 추가 → 2개 완료 → 리뷰에서 완료율 2/3 표시
2. 미완료 1개 Carry 선택 → 다음 주 plan 생성 → carry된 task가 새 id로 생성 + carryFromTaskId 연결
3. Drop 선택 → 원 task dropped로 변경, 다음 주에 생성 안 됨
4. Rescope 선택 → 원 task dropped + 새 task 제목 변경되어 생성
5. Split 선택 → 원 task dropped + 하위 2개 생성(splitParentTaskId 연결)
6. 다음 주 plan이 이미 있는 상태에서 apply → 중복 생성되지 않음
7. 미완료 많을 때 일괄 Carry 후 즉시 next 생성 가능

---

# 최종 확정: MVP1 화면/기능 범위

* Week Plan Doc (note + tasks + top3)
* Weekly Review (completion + note)
* **Carry Inbox (carry/split/drop/rescope)**
* Next week plan auto draft(결과 반영)
* Goals 관리(연결 가능)

---

원하면 다음 턴에서 바로 **Codex용 “프로젝트 부트스트랩 설계”**까지 끊김 없이 이어갈게:

* 폴더 구조(웹/모바일 공용)
* 라우팅(Plan/Goals/Review)
* 상태관리(Zustand 추천) + persistence(localForage)
* 타입/스키마 파일
* 핵심 서비스 함수(week calc, applyCarry) 구현 우선순위

이제 이 PRD 스펙이면 코덱스로 들어가도 “갈팡질팡” 없이 바로 빌드 가능해.
