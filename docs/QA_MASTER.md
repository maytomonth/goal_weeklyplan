# QA_MASTER

## 목적
- STEP3(DB + Google Login) 이전 회귀 방지
- MVP2 핵심 기능/정합성/반응형 레이아웃 검증
- 자동 테스트(Vitest) + 수동 QA 기준 통합

## 범위
- IA/라우팅: Tabs(계획/리뷰/목표/인박스), 상세 라우트, 모달(goal-picker, carry-inbox, assign-goal, trash)
- 핵심 기능: Goal, WeeklyPlan, Task, Review, Carry Inbox, Inbox
- 정합성: soft delete, top3 정리, Inbox goal 제외, carry unique, KST 주차

## 실행 환경
- Node.js 22+
- npm 기반
- 명령:
  - `npm run typecheck`
  - `npm run test:run`
  - `npm run web -- --non-interactive --port 8082`

## 자동 QA 체크리스트 (Vitest)
- [ ] 주차 계산(KST, 월요일 시작)
  - [ ] 월요일 경계
  - [ ] 일요일 경계
  - [ ] 다음 주 계산
- [ ] completionRate
  - [ ] dropped 제외
  - [ ] task 0개면 0
  - [ ] done/todo 비율
- [ ] carry apply
  - [ ] carry/split/drop/rescope 모두 동작
  - [ ] 다음 주 동일 goalId plan ensure
  - [ ] carryFromTaskId/splitParentTaskId 검증
  - [ ] reviewId+fromTaskId 중복 적용 방지
- [ ] top3 정합성
  - [ ] soft delete 시 top3TaskIds 자동 제거
- [ ] Inbox assign
  - [ ] destination plan ensure
  - [ ] task.planId/task.goalId 재배치
  - [ ] inbox list에서 제거
- [ ] 허브 리스트 필터
  - [ ] Plan/Review/Goals에서 Inbox goal 기본 제외

## 수동 QA 체크리스트 - 모바일(<1024)
- [ ] 하단 탭이 `계획/리뷰/목표/인박스`로 표시된다.
  - Expected: 탭 중복/깨짐 없이 4개만 노출
- [ ] 계획 탭 진입 후 주차 이동, 플랜 목록/상세 이동 동작
  - Expected: 플랜 선택 시 상세 화면 전환
- [ ] 목표 생성/수정/보관/삭제 동작
  - Expected: 토스트/리스트 반영 정상
- [ ] 인박스 빠른 추가/배정/삭제/되돌리기
  - Expected: 배정 시 인박스 목록에서 사라지고 목표 플랜에 나타남
- [ ] 모달(goal-picker, assign-goal, carry-inbox, trash) 열림/닫힘
  - Expected: 오버레이/버튼 동작 정상

## 수동 QA 체크리스트 - PC(>=1024)
- [ ] SidebarNav 확장/축소 토글
  - Expected: 토글 시 너비 전환, 상태 유지
- [ ] 계획 3패널 레이아웃
  - Expected: 좌(리스트)-중(상세)-우(지표) 정상 배치
- [ ] 리뷰 2패널 레이아웃
  - Expected: 좌 리스트 선택 시 중앙 상세 변경
- [ ] 목표 2패널 레이아웃
  - Expected: 좌 목표 선택 시 중앙 상세 변경
- [ ] 인박스 2패널 + 드래그 배정
  - Expected: 드래그 오버 강조, 드롭 시 배정 완료

## 데이터 정합성 체크리스트
- [ ] `deletedAt != null` task는 기본 리스트에서 숨김
- [ ] soft delete 시 top3TaskIds 자동 제거
- [ ] Trash에서 restore/hard delete 동작
- [ ] Inbox system goal(`systemType=inbox`)는 허브 기본 제외
- [ ] carryAction unique(`reviewId`, `fromTaskId`) 재적용 방지
- [ ] 주차 계산은 KST 월요일 시작

## 승인 기준
- [ ] `npm run test:run` 통과
- [ ] `docs/QA_SMOKE_SCRIPT.md` 기준 핵심 플로우 점검 완료
- [ ] `docs/QA_RUN_LOG.md`에 자동/수동 결과 기록 완료
