# QA UI STEP2 (Responsive + Dark UI)

검증일: 2026-02-22

## 공통 검증
1. 다크모드 고정
- 기대: 앱 전체가 dark palette로 렌더링되고 라이트 배경이 없음

2. 라우팅 유지
- 기대: 기존 경로(`/plan/index`, `/plan/[planId]`, `/review/...`, `/goals/...`, `/inbox/index`)와 모달 경로가 그대로 동작

3. 모바일 탭 유지
- 조건: width < 1024
- 기대: 하단 탭 표시, 기존 모바일 플로우 유지

4. PC 사이드바 전환
- 조건: width >= 1024
- 기대: 하단 탭 숨김, 좌측 SidebarNav 표시

5. Sidebar 토글 유지
- 기대: Expanded/Collapsed 토글 후 상태가 로컬에 유지됨

## Plan
6. PC 3패널 동작
- 기대: (Sidebar | Left list | Center detail | Right info) 구성

7. 리스트 선택 -> 중앙 상세
- 기대: 플랜 카드 클릭 시 center detail이 즉시 갱신되고 URL에 `planId` 반영

8. Right 패널 정보
- 기대: Top3/metrics/quick actions가 선택된 plan 기준으로 표시

## Review
9. PC 2패널 동작
- 기대: Left(review list) + Center(review detail)

10. Carry 모달
- 기대: center detail에서 Carry Inbox 모달이 열리고 저장/검증 동작 유지

## Goals
11. PC 2패널 동작
- 기대: Left(goal list + create) + Center(goal detail/history)

12. Goal 선택/상세
- 기대: 리스트 클릭 시 center 상세와 URL(`goalId`) 동기화

## Inbox
13. PC 2패널 동작
- 기대: Left(inbox list + quick add) + Center(selected task panel)

14. Assign 모달
- 기대: Inbox에서 Assign 클릭 시 모달 오픈 및 기존 Assign 로직 유지

15. Delete + Undo
- 기대: Delete 후 Undo 토스트로 복원 가능

## 모달 다크 톤
16. `goal-picker`, `carry-inbox`, `assign-goal`, `trash`
- 기대: 밝은 카드/배경이 아닌 dark surface/border/text 토큰 톤으로 표시

## 회귀 체크
17. 타입/테스트
- `npm run typecheck` 통과
- `npm test` 통과
