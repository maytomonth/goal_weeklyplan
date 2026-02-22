# PRD v2.0 — Goal Tracker (MVP2: Goal-based Weekly Plans)

## 0. 문서 목적
본 문서는 Goal Tracker의 **MVP2 기획/스펙**을 정의한다.  
MVP1(주간 플랜 1개 안에 목표/태스크가 혼재)에서 벗어나, **“목표(Goal)당 주간 플랜(Weekly Plan) 1개”** 구조로 전환한다.

---

## 1. 한 줄 정의
사용자는 목표를 만들고, **각 목표마다 주간 플랜(노트+투두)**을 운영한다.  
주간 리뷰에서 **Carry Inbox(이월/쪼개기/폐기/범위조정)**로 미완료를 정리하면, **다음 주의 같은 목표 플랜**으로 자동 반영된다.

---

## 2. 핵심 변화 요약

### 2.1 MVP1 구조(레거시)
- 주간 플랜(Week Plan) 1개
- 그 안에 여러 목표의 Task가 섞임
- Task가 `goalId`로 느슨하게 연결

### 2.2 MVP2 구조(개정)
- 주간 플랜은 **(weekStart × goalId)** 단위로 존재
- 같은 주에 같은 목표의 플랜은 **1개만** 존재
- Plan/Review/Carry 루프가 **목표 단위로 완결**됨

---

## 3. 용어 정의
- **Goal**: 사용자가 달성하고 싶은 목표
- **WeeklyPlan (Goal Weekly Plan)**: 특정 목표의 특정 주에 대한 운영 문서(노트+투두+Top3)
- **Task**: WeeklyPlan에 포함된 실행 항목
- **Review**: WeeklyPlan에 대한 주간 회고
- **Carry Inbox**: Review에서 미완료 Task를 분류(이월/쪼개기/폐기/범위조정)하는 처리함
- **Week Workspace(개념)**: “이번 주”라는 기간 단위의 허브 화면(실제 엔티티가 아닐 수도 있음)

---

## 4. 목표(Goals) / 비목표(Non-goals)

### 4.1 MVP2 목표
- 목표별 주간 플랜 생성/편집/조회
- 목표별 리뷰 및 Carry Inbox
- Carry 결과가 다음 주 **동일 목표** 플랜에 반영
- 주간 기준으로 목표 플랜들을 모아보는 허브 제공
- 목표 상세에서 주간 플랜 히스토리 조회

### 4.2 MVP2 비목표(추후)
- 월간/연간 계획(Plan)
- 복잡한 반복 규칙(습관/빈도 기반)
- 협업/공유/권한
- 고급 통계(이월률 분석, 패턴 분석)

---

## 5. 사용자 흐름(User Flow)

### 5.1 목표 생성
1) 사용자는 Goal을 생성한다(제목/설명/기한 optional).  
2) Goal은 active 상태로 목록에 노출된다.

### 5.2 이번 주 목표 플랜 생성
1) 사용자는 Plan 탭(이번 주 허브)에서 `+ 목표 플랜 추가`를 누른다.  
2) Goal 선택 모달에서 목표를 선택한다.  
3) 시스템은 해당 주의 `(periodStart, goalId)` 플랜을:
   - 없으면 생성
   - 있으면 즉시 열기

### 5.3 실행
- 사용자는 해당 목표 WeeklyPlan 내에서 Task를 추가하고 체크한다.
- Task는 그 목표 플랜 안에서만 생성/관리된다.

### 5.4 리뷰 + Carry Inbox
1) 사용자는 Review 탭에서 목표별 리뷰를 시작한다.
2) 미완료 Task는 Carry Inbox 후보가 된다.
3) 사용자는 각 미완료 Task에 대해:
   - Carry / Split / Drop / Rescope 중 하나를 선택한다.
4) 처리 완료 후 `다음 주 이 목표 플랜 열기(생성)`을 누르면:
   - Carry가 적용되고
   - 다음 주 동일 목표 WeeklyPlan이 생성/열리며
   - 필요한 Task가 자동 반영된다.

---

## 6. 기능 요구사항(Functional Requirements)

### 6.1 Goals
- Goal 생성/수정/아카이브
- Goal 삭제는 MVP2 제외(아카이브로 대체)

### 6.2 WeeklyPlan (Goal Weekly Plan)
- (periodStart, goalId) 유니크
- 노트(note) 자동저장
- Top3(최대 3개 Task pin)
- Task CRUD
- Task reorder(order)

### 6.3 Review
- WeeklyPlan 당 Review 1개(유니크)
- 완료율 자동 계산
- 리뷰 노트(summaryNote) 자동저장

### 6.4 Carry Inbox (핵심)
- 대상: 해당 WeeklyPlan의 `status == todo` Task
- action:
  - carry: 다음 주 동일 goalId WeeklyPlan로 그대로 이월
  - split: 원본은 dropped 처리, 하위 task들을 다음 주로 생성
  - drop: 원본 task dropped 처리, 다음 주로 이월하지 않음
  - rescope: 원본 dropped + 더 작은 task를 다음 주로 생성
- action 미선택은 기본값 carry(단, UX에서 일괄 carry 제공)

---

## 7. 비기능 요구사항(Non-functional Requirements)
- Timezone: Asia/Seoul (KST)
- Week start: Monday 00:00 KST
- Plan/Review/Carry는 **작은 조작으로 빠르게** 처리 가능해야 한다.
- 로컬 우선 저장 + 향후 동기화 확장 가능(Supabase/Firebase 등)

---

## 8. 데이터 모델(Data Model) — MVP2 확정

### 8.1 Goal
- id (uuid)
- title (string, required)
- description (string, optional)
- dueType ("none" | "date")
- dueDate (date, optional)
- status ("active" | "archived")
- createdAt, updatedAt

### 8.2 WeeklyPlan (Goal Weekly Plan)
- id (uuid)
- type = "week"
- periodStart (datetime ISO, KST 기준 주 월요일 00:00)
- periodEnd (datetime ISO, 다음 주 월요일 00:00, exclusive)
- goalId (uuid, required)
- note (string, default "")
- top3TaskIds (string[], default [])
- createdFromPlanId (uuid?, optional)
- createdAt, updatedAt
- unique(periodStart, goalId)

### 8.3 Task
- id (uuid)
- planId (uuid, required) — WeeklyPlan ID
- goalId (uuid, required) — plan.goalId와 동일(일관성 목적)
- title (string, required)
- status ("todo" | "done" | "dropped")
- order (number, required)
- carryFromTaskId (uuid?, optional)
- splitParentTaskId (uuid?, optional)
- createdAt, updatedAt

### 8.4 Review
- id (uuid)
- planId (uuid, required, unique)
- summaryNote (string, default "")
- completionRate (number, 0..1)
- createdAt, updatedAt

### 8.5 CarryAction
- id (uuid)
- reviewId (uuid, required)
- fromTaskId (uuid, required)
- action ("carry" | "split" | "drop" | "rescope")
- toTaskIds (uuid[], default [])
- note (string?, optional)
- createdAt
- unique(reviewId, fromTaskId)  // 재적용 방지

---

## 9. 핵심 계산/로직 규칙

### 9.1 주차 계산
- periodStart = KST 기준 해당 주 월요일 00:00
- periodEnd = 다음 주 월요일 00:00 (exclusive)

### 9.2 완료율(completionRate) 계산
- 분모: status != dropped
- completionRate = doneCount / (doneCount + todoCount)
- task 0개이면 0

### 9.3 Carry 적용 규칙(목표 단위)
- 다음 주 WeeklyPlan은 `(nextPeriodStart, sameGoalId)`로 생성/조회
- carry: next plan에 task 복제(새 id) + carryFromTaskId
- drop: 원 task dropped
- rescope: 원 task dropped + next plan에 새 title task 생성(carryFromTaskId)
- split: 원 task dropped + next plan에 child tasks 생성(splitParentTaskId)

### 9.4 기본값/일괄 처리
- action 미선택 시 기본 carry
- UX에서 “일괄 Carry” 버튼 제공(피로도 방지)

---

## 10. 화면/IA (Information Architecture)

### 10.1 탭 구조
- Plan
- Goals
- Review

### 10.2 Plan 탭 — “이번 주 목표 플랜 허브”
- 주차 선택(이전/다음)
- 이번 주 Goal WeeklyPlan 카드 리스트
  - 목표명, 완료율, 남은 todo 수, Top3 미리보기, 리뷰 상태
- CTA: + 목표 플랜 추가(Goal 선택 → plan 생성/열기)

#### Plan Detail(Goal WeeklyPlan)
- Note(자동 저장)
- Top3 pin(최대 3)
- Task list(CRUD, reorder, done toggle)
- Review 버튼(해당 plan review로 이동)

### 10.3 Review 탭 — “이번 주 목표 리뷰 허브”
- 주차 선택
- 이번 주 Goal WeeklyPlan 리스트(리뷰 상태/미완료/완료율 표시)
- 클릭 → Review Detail

#### Review Detail
- completionRate, metrics
- summaryNote(자동 저장)
- Carry Inbox(미완료 tasks)
- CTA: 다음 주 이 목표 플랜 열기(생성) — Carry 처리 완료 조건부 활성

### 10.4 Goals 탭
- Goals list(생성/아카이브)
- Goal detail:
  - goal info
  - 최근 n주 WeeklyPlan 히스토리(week label, completionRate, note summary)
  - 특정 주 plan으로 이동

---

## 11. 엣지 케이스(Edge Cases)

1) 같은 주에 같은 목표 플랜을 중복 생성하려는 경우:
   - 생성 대신 기존 플랜을 열기

2) goalId 없는 레거시 task 존재:
   - 시스템 Goal “Inbox” 자동 생성 후 이관(권장)
   - 또는 사용자에게 goal 선택 유도(이탈 위험↑)

3) Review/Carry 재적용:
   - CarryAction unique(reviewId, fromTaskId)로 재적용 방지

4) Split에서 하위 task 입력이 비어있음:
   - 최소 1개 이상 필수

5) Rescope title 비어있음:
   - 필수 입력

6) 다음 주 플랜이 이미 존재하는데 carry를 적용할 때:
   - 기존 next plan에 추가하되, 동일 carryAction이면 중복 생성 금지

---

## 12. 마이그레이션(From MVP1 to MVP2)

### 12.1 권장 전략: 자동 이관 + 레거시 보존
- v1 주간 플랜 엔티티는 “legacy”로 남기거나 숨김 처리
- v1 tasks를 goalId 기준으로 그룹핑하여:
  - 각 그룹에 대해 (periodStart, goalId) WeeklyPlan 생성
  - task.planId를 새 weeklyPlanId로 업데이트
- goalId 없는 task는 “Inbox” goal + 해당 주 Inbox weeklyPlan으로 이관

### 12.2 레거시 리뷰 처리
- 과거 주의 리뷰를 목표별로 완벽 분해하는 것은 MVP2 범위에서 제외
- 과거 데이터는 legacy로 보존하되, 앞으로 생성되는 리뷰부터 v2 기준으로 운용

---

## 13. 완료 기준(Definition of Done)
MVP2에서 사용자는 아래 사이클을 목표 단위로 끝낼 수 있어야 한다.

- Goal 생성
- 이번 주 Goal WeeklyPlan 생성/편집
- Task 수행/체크
- 해당 목표 주간 Review 수행
- Carry Inbox에서 미완료 처리
- 다음 주 동일 목표 WeeklyPlan 생성/열기 + 이월 반영 확인

---

## 14. QA 시나리오(최소)
1) 목표 A/B 생성 → 이번 주 A/B 플랜 생성 → 각각 task 추가/완료 → 완료율 표시 확인
2) 목표 A 플랜 리뷰에서 carry 적용 → 다음 주 A 플랜에 task 복제 반영 확인
3) 목표 A split/rescope/drop 각각 동작 확인(원본 dropped, next 생성 규칙)
4) 다음 주 플랜이 이미 있는 상태에서 carry 적용 → 중복 생성 방지 확인
5) 레거시 goalId 없는 task → Inbox goal 자동 이관 확인

---

## 15. Deletion & Archiving Policy

### 15.1 Goal
- 기본 액션: `Archive` (복구 가능)
- 옵션 액션: `Hard Delete` (영구 삭제)
- Hard Delete 시 해당 Goal과 연결된 모든 `WeeklyPlan/Task/Review/CarryAction`을 cascade 삭제

### 15.2 WeeklyPlan (Goal Weekly Plan)
- Plan Detail에서 영구 삭제 제공
- 삭제 시 해당 plan 하위 `Task/Review/CarryAction` cascade 삭제

### 15.3 Task
- Plan Detail에서 Task 삭제는 `Soft Delete`로 동작 (`deletedAt` 설정)
- 기본 리스트/셀렉터는 `deletedAt == null`만 노출
- 삭제 직후 토스트 `삭제됨` + `Undo(10초)` 제공
- 삭제된 task가 `Top3`에 포함되어 있으면 `top3TaskIds`에서 자동 제거
- `Hard Delete`는 휴지통에서 수행하며 엔티티를 실제 제거(복구 불가)

### 15.4 Trash (선택 화면)
- 탭 추가 없이 모달/More 진입으로 제공
- 삭제된 Task 목록 조회 + `복원/영구삭제` 제공

### 15.5 용어 구분
- `Task 삭제`: 사용자 오조작/정리용 데이터 삭제 정책
- `Drop`: Review Carry Inbox에서 다음 주로 넘기지 않는 의사결정(리뷰 맥락 유지)
